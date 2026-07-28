'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toaster';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_NOTES } from '@/lib/demoData';
import { Send, BookOpen, Plus, Loader2, Bot, User, X, Brain } from 'lucide-react';

import { v4 as uuid } from 'uuid';

import { PageHeader } from '@/components/layout/PageHeader';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Note {
  id: string;
  title: string;
  content?: string;
  subject_name?: string;
  updated_at: string;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  note_title: string;
}

type Tab = 'chat' | 'notes' | 'flashcards';

export default function StudyBuddyPage() {
  const { isDemoMode } = useAuth();
  const [tab, setTab] = useState<Tab>('chat');
  const [sessionId] = useState(uuid());
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your CampusCore AI Study Buddy 👋 Ask me questions about your coursework, upload notes to generate flashcards, or practice quiz questions." }
  ]);
  const [input, setInput] = useState('');
  const [newNote, setNewNote] = useState({ title: '', content: '', subjectId: '' });
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [demoNotesList, setDemoNotesList] = useState(DEMO_NOTES);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const qc = useQueryClient();


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      api.post('/ai/chat', { sessionId, message }).then(r => r.data),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    },
    onError: () => {
      if (isDemoMode) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Here is a quick study summary: Binary trees facilitate O(log n) search operations when balanced. Always balance tree height to maintain optimal lookup performance!"
        }]);
      } else {
        toast('error', 'Failed to get AI response');
      }
    },
  });

  const sendMessage = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    chatMutation.mutate(msg);
  };

  const { data: notes } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.get('/ai/notes').then(r => r.data),
    enabled: !isDemoMode,
  });

  const { data: flashcards } = useQuery({
    queryKey: ['flashcards'],
    queryFn: () => api.get('/ai/flashcards').then(r => r.data),
    enabled: !isDemoMode,
  });

  const effectiveNotes = isDemoMode ? { data: demoNotesList } : notes;
  const demoFlashcards = [
    { id: 'fc-1', question: 'What is the root node color rule in a Red-Black Tree?', answer: 'The root node must always be Black.', note_title: 'Red-Black Tree Properties' },
    { id: 'fc-2', question: 'Which CPU scheduling algorithm guarantees no starvation for short tasks?', answer: 'Shortest Remaining Time First (SRTF) / Round Robin.', note_title: 'Process Scheduling Algorithms' },
    { id: 'fc-3', question: 'What is the average time complexity of BST lookup?', answer: 'O(log n) on balanced trees.', note_title: 'Red-Black Tree Properties' },
  ];
  const effectiveFlashcards = isDemoMode ? { data: demoFlashcards } : flashcards;

  const createNoteMutation = useMutation({
    mutationFn: (data: typeof newNote) => {
      const payload = {
        title: data.title,
        content: data.content,
        subjectId: data.subjectId && data.subjectId.trim() !== '' ? data.subjectId : undefined,
      };
      return api.post('/ai/notes', payload);
    },
    onSuccess: () => {
      toast('success', 'Note saved!');
      qc.invalidateQueries({ queryKey: ['notes'] });
      setNewNote({ title: '', content: '', subjectId: '' });
      setShowNoteForm(false);
    },
    onError: (err: { response?: { data?: { error?: string } }; message?: string }) => {
      toast('error', err?.response?.data?.error || err?.message || 'Failed to save note');
    },
  });

  const handleSaveNote = () => {
    if (!newNote.title || !newNote.content) return;

    if (isDemoMode) {
      const createdNote = {
        id: `note-${Date.now()}`,
        title: newNote.title,
        content: newNote.content,
        subject_id: newNote.subjectId || 'sub-1',
        subject_name: 'General',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDemoNotesList(prev => [createdNote, ...prev]);
      toast('success', 'Note saved!');
      setNewNote({ title: '', content: '', subjectId: '' });
      setShowNoteForm(false);
    } else {
      createNoteMutation.mutate(newNote);
    }
  };

  const generateFlashcardsMutation = useMutation({
    mutationFn: (noteId: string) => api.post('/ai/flashcards', { noteId }),
    onSuccess: () => {
      toast('success', 'Flashcards generated!');
      qc.invalidateQueries({ queryKey: ['flashcards'] });
      setTab('flashcards');
    },
    onError: () => toast('error', 'Failed to generate flashcards'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ai/notes/${id}`),
    onSuccess: () => {
      toast('success', 'Note deleted');
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'AI Chat Buddy', icon: <Bot className="w-4 h-4" /> },
    { id: 'notes', label: 'My Notes', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Brain className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="AI Study Buddy"
        category="Tools & AI"
        breadcrumb="Study Companion"
      />

      {/* Tabs Header */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
              tab === t.id
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>


      {/* CHAT TAB */}
      {tab === 'chat' && (
        <div className="card flex flex-col shadow-md overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '440px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" role="log" aria-label="Chat messages" aria-live="polite">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold shadow-sm ${
                  msg.role === 'assistant'
                    ? 'bg-blue-600 text-white'
                    : 'bg-indigo-600 text-white'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed font-medium ${
                    msg.role === 'user'
                      ? 'btn-primary rounded-tr-none text-white'
                      : 'bg-[var(--bg-input)] border rounded-tl-none border-[var(--border-default)]'
                  }`}
                  style={{ color: msg.role === 'user' ? 'white' : 'var(--text-primary)' }}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border rounded-tl-none border-[var(--border-default)] flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Processing query...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-[var(--bg-card)]" style={{ borderColor: 'var(--border-default)' }}>
            <form
              className="flex gap-2"
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
            >
              <input
                type="text"
                className="input flex-1 font-medium"
                placeholder="Ask a question about your courses, formulas, or notes..."
                value={input}
                onChange={e => setInput(e.target.value)}
                aria-label="Type your message"
                disabled={chatMutation.isPending}
              />
              <button
                type="submit"
                className="btn-primary px-5 font-bold shadow-md"
                disabled={!input.trim() || chatMutation.isPending}
                aria-label="Send message"
              >
                {chatMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NOTES TAB */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary font-bold shadow-sm" onClick={() => setShowNoteForm(p => !p)}>
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>

          {showNoteForm && (
            <div className="card p-6 space-y-4 animate-slide-up shadow-lg">
              <h3 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>Create Study Note</h3>
              <input
                className="input font-semibold"
                placeholder="Note title..."
                value={newNote.title}
                onChange={e => setNewNote(p => ({ ...p, title: e.target.value }))}
                aria-label="Note title"
              />
              <textarea
                className="input"
                rows={8}
                placeholder="Enter or paste study content... (AI uses this for flashcards & quizzes)"
                value={newNote.content}
                onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))}
                aria-label="Note content"
              />
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setShowNoteForm(false)}>Cancel</button>
                <button
                  className="btn-primary flex-1 font-bold"
                  disabled={!newNote.title || !newNote.content || createNoteMutation.isPending}
                  onClick={handleSaveNote}
                >
                  {createNoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {effectiveNotes?.data?.map((note: Note) => (
              <div key={note.id} className="card p-5 group flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>{note.title}</h3>
                    <button
                      className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      onClick={() => {
                        if (isDemoMode) {
                          setDemoNotesList(prev => prev.filter(n => n.id !== note.id));
                          toast('success', 'Note deleted');
                        } else {
                          deleteNoteMutation.mutate(note.id);
                        }
                      }}
                      aria-label={`Delete note: ${note.title}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {note.subject_name && (
                    <p className="text-xs mb-2 font-bold text-blue-600 dark:text-blue-400">{note.subject_name}</p>
                  )}
                  {note.content && (
                    <p className="text-xs sm:text-sm line-clamp-4 whitespace-pre-wrap mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {note.content}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <button
                    className="btn-secondary text-xs font-bold py-1.5 px-3"
                    onClick={() => {
                      if (isDemoMode) {
                        toast('success', 'Flashcards generated!');
                        setTab('flashcards');
                      } else {
                        generateFlashcardsMutation.mutate(note.id);
                      }
                    }}
                    disabled={generateFlashcardsMutation.isPending}
                  >
                    <Brain className="w-3.5 h-3.5 text-blue-500" />
                    Generate Flashcards
                  </button>
                </div>
              </div>
            ))}
            {!effectiveNotes?.data?.length && (
              <div className="col-span-2 card p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="font-bold text-sm" style={{ color: 'var(--text-muted)' }}>No notes saved yet. Click "New Note" to create one.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLASHCARDS TAB */}
      {tab === 'flashcards' && (
        <div className="space-y-4">
          <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Click a card to flip between Question and Answer.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {effectiveFlashcards?.data?.map((card: Flashcard) => (
              <button
                key={card.id}
                className="relative h-44 rounded-2xl cursor-pointer select-none text-left w-full"
                style={{ perspective: '1000px' }}
                onClick={() => setFlippedCards(prev => {
                  const next = new Set(prev);
                  if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
                  return next;
                })}
                aria-label={flippedCards.has(card.id) ? `Answer: ${card.answer}` : `Question: ${card.question}`}
                aria-pressed={flippedCards.has(card.id)}
              >
                <div
                  className="w-full h-full relative"
                  style={{
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.4s',
                    transform: flippedCards.has(card.id) ? 'rotateY(180deg)' : 'rotateY(0)',
                  }}
                >
                  {/* Front */}
                  <div className="card absolute inset-0 flex flex-col justify-between p-5 backface-hidden shadow-sm" style={{ backfaceVisibility: 'hidden' }}>
                    <span className="badge badge-brand font-bold text-[10px] self-start">Question</span>
                    <p className="text-sm font-bold text-center my-auto" style={{ color: 'var(--text-primary)' }}>{card.question}</p>
                    <span className="text-[10px] font-bold text-center text-blue-500 uppercase tracking-wider">Tap to flip 🔄</span>
                  </div>
                  {/* Back */}
                  <div
                    className="card absolute inset-0 flex flex-col justify-between p-5"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: 'var(--bg-badge)',
                    }}
                  >
                    <span className="badge badge-success font-bold text-[10px] self-start">Answer</span>
                    <p className="text-sm font-extrabold text-center my-auto text-emerald-800 dark:text-emerald-300">{card.answer}</p>
                    <span className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-wider">Tap to flip 🔄</span>
                  </div>
                </div>
              </button>
            ))}
            {!effectiveFlashcards?.data?.length && (
              <div className="col-span-3 card p-12 text-center">
                <Brain className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="font-bold text-sm" style={{ color: 'var(--text-muted)' }}>No flashcards generated yet. Create a note and click "Generate Flashcards"!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
