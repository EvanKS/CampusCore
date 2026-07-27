import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { supabase } from '../db/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import {
  chatWithStudyBuddy,
  generateFlashcards,
  generateQuiz,
  generateAISummary,
} from '../services/aiService';

export const aiRouter = Router();
aiRouter.use(authenticate);

const ChatSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  noteIds: z.array(z.string().uuid()).optional(),
});

const FlashcardSchema = z.object({
  noteId: z.string().uuid(),
});

const QuizSchema = z.object({
  noteId: z.string().uuid(),
  questionCount: z.number().int().min(1).max(20).default(5),
});

const SummarizeSchema = z.object({
  title: z.string(),
  content: z.string().min(1),
});

// POST /api/ai/chat
aiRouter.post('/chat', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = ChatSchema.parse(req.body);
  const user = req.user!;
  const sessionId = body.sessionId ?? uuid();

  let notesContext = '';
  if (body.noteIds && body.noteIds.length > 0) {
    const { data: notes } = await supabase
      .from('notes')
      .select('title, content')
      .in('id', body.noteIds)
      .eq('student_user_id', user.userId);

    notesContext = (notes ?? []).map(n => `## ${n.title}\n${n.content}`).join('\n\n');
  } else {
    const { data: notes } = await supabase
      .from('notes')
      .select('title, content')
      .eq('student_user_id', user.userId)
      .order('updated_at', { ascending: false })
      .limit(5);

    notesContext = (notes ?? []).map(n => `## ${n.title}\n${n.content}`).join('\n\n');
  }

  const { data: history } = await supabase
    .from('study_chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20);

  const formattedHistory = (history ?? []).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content }));

  const reply = await chatWithStudyBuddy({
    message: body.message,
    history: formattedHistory,
    notesContext,
  });

  await supabase.from('study_chat_messages').insert([
    { session_id: sessionId, student_user_id: user.userId, institution_id: user.institutionId, role: 'user', content: body.message },
    { session_id: sessionId, student_user_id: user.userId, institution_id: user.institutionId, role: 'assistant', content: reply },
  ]);

  res.json({ sessionId, reply });
}));

// POST /api/ai/flashcards
aiRouter.post('/flashcards', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const { noteId } = FlashcardSchema.parse(req.body);
  const user = req.user!;

  const { data: note } = await supabase
    .from('notes')
    .select('title, content')
    .eq('id', noteId)
    .eq('student_user_id', user.userId)
    .single();

  if (!note) throw new AppError(404, 'Note not found');

  const cards = await generateFlashcards((note as Record<string, string>).title, (note as Record<string, string>).content);

  const saved = [];
  for (const card of cards) {
    const { data: fc } = await supabase
      .from('flashcards')
      .insert({
        note_id: noteId,
        student_user_id: user.userId,
        institution_id: user.institutionId,
        question: card.question,
        answer: card.answer,
      })
      .select()
      .single();
    if (fc) saved.push(fc);
  }

  res.status(201).json({ data: saved });
}));

// GET /api/ai/flashcards
aiRouter.get('/flashcards', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const { noteId } = req.query;
  const user = req.user!;

  let q = supabase
    .from('flashcards')
    .select('*, notes(title)')
    .eq('student_user_id', user.userId)
    .order('created_at', { ascending: false });

  if (noteId) q = q.eq('note_id', noteId as string);

  const { data, error } = await q;
  if (error) throw new AppError(500, error.message);

  const rows = (data ?? []).map((f: Record<string, unknown>) => ({
    ...f,
    note_title: (f.notes as Record<string, string> | null)?.title,
    notes: undefined,
  }));

  res.json({ data: rows });
}));

// POST /api/ai/quiz
aiRouter.post('/quiz', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = QuizSchema.parse(req.body);
  const user = req.user!;

  const { data: note } = await supabase
    .from('notes')
    .select('title, content')
    .eq('id', body.noteId)
    .eq('student_user_id', user.userId)
    .single();

  if (!note) throw new AppError(404, 'Note not found');

  const questions = await generateQuiz(
    (note as Record<string, string>).title,
    (note as Record<string, string>).content,
    body.questionCount
  );

  res.json({ data: questions });
}));

// POST /api/ai/summarize
aiRouter.post('/summarize', authorize('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const body = SummarizeSchema.parse(req.body);
  const summary = await generateAISummary(body.title, body.content);
  res.json({ summary });
}));

// Notes CRUD
const CreateNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  subjectId: z.string().uuid().optional().nullable().or(z.literal('')),
});

aiRouter.get('/notes', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { data, error } = await supabase
    .from('notes')
    .select('*, subjects(name)')
    .eq('student_user_id', user.userId)
    .order('updated_at', { ascending: false });

  if (error) throw new AppError(500, error.message);

  const rows = (data ?? []).map((n: Record<string, unknown>) => ({
    ...n,
    subject_name: (n.subjects as Record<string, string> | null)?.name,
    subjects: undefined,
  }));

  res.json({ data: rows });
}));

aiRouter.post('/notes', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = CreateNoteSchema.parse(req.body);
  const user = req.user!;
  const subjectId = (body.subjectId && body.subjectId.trim() !== '') ? body.subjectId : null;

  const { data, error } = await supabase
    .from('notes')
    .insert({
      institution_id: user.institutionId,
      student_user_id: user.userId,
      subject_id: subjectId,
      title: body.title,
      content: body.content,
    })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json(data);
}));

aiRouter.patch('/notes/:id', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = CreateNoteSchema.partial().parse(req.body);
  const user = req.user!;
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;

  if (Object.keys(updates).length === 0) { res.json({ message: 'No changes' }); return; }

  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', req.params.id)
    .eq('student_user_id', user.userId)
    .select()
    .single();

  if (error || !data) throw new AppError(404, 'Note not found');
  res.json(data);
}));

aiRouter.delete('/notes/:id', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', req.params.id)
    .eq('student_user_id', req.user!.userId);

  if (error) throw new AppError(500, error.message);
  res.status(204).send();
}));
