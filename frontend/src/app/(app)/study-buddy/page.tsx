'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toaster';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_NOTES } from '@/lib/demoData';
import { Send, Sparkles, BookOpen, Plus, Loader2, Bot, User, X, Brain } from 'lucide-react';
import { v4 as uuid } from 'uuid';

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
    { role: 'assistant', content: "Hi! I'm your CampusFlow Study Buddy 👋 I can help you understand your notes, generate flashcards, create quiz questions, or just chat about any academic topic. What would you like to work on?" }
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
          content: "Here is a quick answer: Data structures are fundamental ways of organizing data. In binary search trees, smaller items go left and larger items go right!"
        }]);
      } else {
        toast('error', 'Failed to get response');
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
    { id: 'fc-1', question: 'What is the root node color in a Red-Black Tree?', answer: 'Black', note_title: 'Red-Black Tree Properties' },
    { id: 'fc-2', question: 'Which process scheduling algorithm is non-preemptive?', answer: 'First-Come, First-Served (FCFS)', note_title: 'Process Scheduling Algorithms' },
    { id: 'fc-3', question: 'What is the time complexity of searching in a BST?', answer: 'O(log n) on average, O(n) worst case', note_title: 'Red-Black Tree Properties' },
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
      console.error('Save note error:', err);
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
    { id: 'chat', label: 'Chat', icon: <Bot className="w-4 h-4" /> },
    { id: 'notes', label: 'Notes', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Brain className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Sparkles className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
          AI Study Buddy
        </h1>
        <p className="page-subtitle">Powered by Groq (Llama 3.3) with Gemini fallback</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-input)' }} role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-[var(--bg-card)] shadow-sm'
                : 'hover:bg-[var(--bg-card-hover)]'
            }`}
            style={{ color: tab === t.id ? 'var(--color-brand-primary)' : 'var(--text-secondary)' }}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ====== CHAT TAB ====== */}
      {tab === 'chat' && (
        <div className="card flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-label="Chat messages" aria-live="polite">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'assistant'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                }`}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div
                  className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'btn-primary rounded-tr-none'
                      : 'bg-[var(--bg-input)] border rounded-tl-none'
                  }`}
                  style={{ borderColor: 'var(--border-default)' }}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border rounded-tl-none flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <form
              className="flex gap-2"
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
            >
              <input
                type="text"
                className="input flex-1"
                placeholder="Ask about your notes, concepts, formulas..."
                value={input}
                onChange={e => setInput(e.target.value)}
                aria-label="Type your message"
                disabled={chatMutation.isPending}
              />
              <button
                type="submit"
                className="btn-primary px-4"
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

      {/* ====== NOTES TAB ====== */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setShowNoteForm(p => !p)}>
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </div>

          {showNoteForm && (
            <div className="card p-5 space-y-4 animate-slide-up">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Create Note</h3>
              <input
                className="input"
                placeholder="Note title..."
                value={newNote.title}
                onChange={e => setNewNote(p => ({ ...p, title: e.target.value }))}
                aria-label="Note title"
              />
              <textarea
                className="input"
                rows={8}
                placeholder="Your notes... (AI will use this for flashcards and quiz generation)"
                value={newNote.content}
                onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))}
                aria-label="Note content"
              />
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setShowNoteForm(false)}>Cancel</button>
                <button
                  className="btn-primary flex-1"
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
              <div key={note.id} className="card p-5 group flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{note.title}</h3>
                    <button
                      className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
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
                    <p className="text-xs mb-2 font-medium" style={{ color: 'var(--color-brand-primary)' }}>{note.subject_name}</p>
                  )}
                  {note.content && (
                    <p className="text-sm line-clamp-4 whitespace-pre-wrap mt-2" style={{ color: 'var(--text-secondary)' }}>
                      {note.content}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <button
                    className="btn-secondary text-xs py-1"
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
                    <Brain className="w-3 h-3" />
                    Generate Flashcards
                  </button>
                </div>
              </div>
            ))}
            {!effectiveNotes?.data?.length && (
              <div className="col-span-2 card p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>No notes yet. Create your first note!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== FLASHCARDS TAB ====== */}
      {tab === 'flashcards' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Click a card to flip it and reveal the answer.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {effectiveFlashcards?.data?.map((card: Flashcard) => (
              <button
                key={card.id}
                className="relative h-40 rounded-xl cursor-pointer"
                style={{ perspective: '1000px' }}
                onClick={() => setFlippedCards(prev => {
                  const next = new Set(prev);
                  if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
                  return next;
                })}
                aria-label={flippedCards.has(card.id) ? `Answer: ${card.answer}` : `Question: ${card.question}. Click to reveal answer.`}
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
                  <div className="card absolute inset-0 flex flex-col items-center justify-center p-4 backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-brand-primary)' }}>Q</p>
                    <p className="text-sm text-center" style={{ color: 'var(--text-primary)' }}>{card.question}</p>
                  </div>
                  {/* Back */}
                  <div
                    className="card absolute inset-0 flex flex-col items-center justify-center p-4"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: 'var(--bg-badge)',
                    }}
                  >
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-brand-primary)' }}>A</p>
                    <p className="text-sm text-center" style={{ color: 'var(--text-primary)' }}>{card.answer}</p>
                  </div>
                </div>
              </button>
            ))}
            {!effectiveFlashcards?.data?.length && (
              <div className="col-span-3 card p-12 text-center">
                <Brain className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>No flashcards yet. Generate from your notes!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
