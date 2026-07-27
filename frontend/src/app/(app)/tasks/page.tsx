'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Trash2, Edit3, Clock, CheckCircle, Loader2, X, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toaster';
import { DEMO_TASKS } from '@/lib/demoData';

const TaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']),
  deadlineAt: z.string().optional(),
});

type TaskForm = z.infer<typeof TaskSchema>;

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  deadline_at?: string;
  google_calendar_url?: string;
  subject_name?: string;
  created_at: string;
}

const priorityColors: Record<string, string> = {
  urgent: 'badge-danger',
  high: 'badge-warning',
  medium: 'badge-info',
  low: '',
};

const statusColors: Record<string, string> = {
  pending: 'badge-info',
  in_progress: 'badge-brand',
  completed: 'badge-success',
  overdue: 'badge-danger',
};

export default function TasksPage() {
  const { user, isDemoMode } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [demoTasks, setDemoTasks] = useState<Task[]>(DEMO_TASKS as Task[]);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => api.get(`/tasks${filter ? `?status=${filter}` : ''}`).then(r => r.data),
    enabled: !isDemoMode,
  });


  // Demo mode handlers
  const handleDemoCreate = (formData: TaskForm) => {
    const newTask: Task = {
      id: `task-demo-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      deadline_at: formData.deadlineAt,
      created_at: new Date().toISOString(),
    };
    setDemoTasks(prev => [newTask, ...prev]);
    toast('success', 'Task created!');
    setShowForm(false);
  };

  const handleDemoUpdate = (id: string, formData: Partial<TaskForm>) => {
    setDemoTasks(prev => prev.map(t => t.id === id ? { ...t, ...formData, deadline_at: formData.deadlineAt ?? t.deadline_at } : t));
    toast('success', 'Task updated!');
    setEditTask(null);
  };

  const handleDemoDelete = (id: string) => {
    setDemoTasks(prev => prev.filter(t => t.id !== id));
    toast('success', 'Task deleted');
  };

  const createMutation = useMutation({
    mutationFn: (data: TaskForm) => api.post('/tasks', {
      ...data,
      deadlineAt: data.deadlineAt || undefined,
    }),
    onSuccess: () => {
      toast('success', 'Task created successfully!');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
    },
    onError: (err: { response?: { data?: { error?: string } }; message?: string }) => {
      toast('error', err?.response?.data?.error || err?.message || 'Failed to create task');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskForm> }) =>
      api.patch(`/tasks/${id}`, data),
    onSuccess: () => {
      toast('success', 'Task updated!');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setEditTask(null);
    },
    onError: () => toast('error', 'Failed to update task'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      toast('success', 'Task deleted');
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast('error', 'Failed to delete task'),
  });

  const toggleComplete = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    if (isDemoMode) {
      handleDemoUpdate(task.id, { status: newStatus });
    } else {
      updateMutation.mutate({ id: task.id, data: { status: newStatus } });
    }
  };

  const rawTasks: Task[] = isDemoMode ? demoTasks : (data?.data ?? []);
  const tasks = filter ? rawTasks.filter(t => t.status === filter) : rawTasks;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 page-header mb-0">
          <h1 className="page-title">Tasks & Deadlines</h1>
          <p className="page-subtitle">Manage your academic tasks and set reminders.</p>
        </div>
        {user?.role === 'student' && (
          <button
            className="btn-primary shrink-0"
            onClick={() => { setShowForm(true); setEditTask(null); }}
            aria-label="Add new task"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filter tasks by status">
        {['', 'pending', 'in_progress', 'completed', 'overdue'].map(s => (
          <button
            key={s || 'all'}
            role="tab"
            aria-selected={filter === s}
            className={`badge cursor-pointer transition-all ${
              filter === s ? 'badge-brand font-semibold' : 'bg-[var(--bg-card)] border border-[var(--border-default)]'
            }`}
            onClick={() => setFilter(s)}
            style={{ color: filter === s ? 'var(--text-brand)' : 'var(--text-secondary)' }}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {/* Task form modal */}
      {(showForm || editTask) && (
        <TaskModal
          task={editTask}
          onSubmit={(formData) => {
            if (isDemoMode) {
              if (editTask) { handleDemoUpdate(editTask.id, formData); } else { handleDemoCreate(formData); }
            } else {
              if (editTask) { updateMutation.mutate({ id: editTask.id, data: formData }); } else { createMutation.mutate(formData); }
            }
          }}
          onClose={() => { setShowForm(false); setEditTask(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Tasks list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No tasks found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {user?.role === 'student' ? 'Click "Add Task" to get started.' : 'No tasks in this view.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="card p-4 flex items-start gap-4 group hover:shadow-md transition-all">
              {/* Checkbox (student only) */}
              {user?.role === 'student' && (
                <button
                  className="mt-0.5 shrink-0 p-0 btn-ghost"
                  onClick={() => toggleComplete(task)}
                  aria-label={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    task.status === 'completed'
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-[var(--border-default)]'
                  }`}>
                    {task.status === 'completed' && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                </button>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3
                    className={`font-medium text-sm ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {task.title}
                  </h3>
                  <span className={`badge ${priorityColors[task.priority] || ''}`}>{task.priority}</span>
                  <span className={`badge ${statusColors[task.status] || ''}`}>{task.status.replace('_', ' ')}</span>
                </div>

                {task.description && (
                  <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {task.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {task.subject_name && (
                    <span>{task.subject_name}</span>
                  )}
                  {task.deadline_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(task.deadline_at), { addSuffix: true })}
                    </span>
                  )}

                  {/* Google Calendar Invite Link */}
                  {(task.google_calendar_url || task.deadline_at) && (
                    <a
                      href={
                        task.google_calendar_url ||
                        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('[CampusFlow] ' + task.title)}&details=${encodeURIComponent(task.description || '')}&dates=${new Date(task.deadline_at || Date.now()).toISOString().replace(/-|:|\.\d\d\d/g, '')}/${new Date((new Date(task.deadline_at || Date.now())).getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                      title="Add to your personal Google Calendar"
                    >
                      <Calendar className="w-3 h-3" />
                      Add to Google Calendar
                    </a>
                  )}
                </div>
              </div>

              {/* Actions (student only) */}
              {user?.role === 'student' && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    className="btn-ghost p-1.5"
                    onClick={() => setEditTask(task)}
                    aria-label={`Edit task: ${task.title}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-ghost p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                    onClick={() => {
                        if (confirm('Delete this task?')) {
                          if (isDemoMode) { handleDemoDelete(task.id); } else { deleteMutation.mutate(task.id); }
                        }
                      }}
                    aria-label={`Delete task: ${task.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskModal({
  task, onSubmit, onClose, isLoading,
}: {
  task: Task | null;
  onSubmit: (data: TaskForm) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<TaskForm>({
    resolver: zodResolver(TaskSchema),
    defaultValues: task ? {
      title: task.title,
      description: task.description ?? '',
      priority: task.priority as TaskForm['priority'],
      status: task.status as TaskForm['status'],
      deadlineAt: task.deadline_at ? format(new Date(task.deadline_at), "yyyy-MM-dd'T'HH:mm") : '',
    } : {
      priority: 'medium',
      status: 'pending',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
      <div className="card w-full max-w-lg p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 id="task-modal-title" className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Close dialog">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="task-title" className="label">Title *</label>
            <input id="task-title" className="input" placeholder="What needs to be done?" {...register('title')} aria-invalid={!!errors.title} />
            {errors.title && <p className="text-xs mt-1 text-red-500" role="alert">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="task-desc" className="label">Description</label>
            <textarea id="task-desc" className="input" rows={3} placeholder="Additional details..." {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-priority" className="label">Priority</label>
              <select id="task-priority" className="input" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-status" className="label">Status</label>
              <select id="task-status" className="input" {...register('status')}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="task-deadline" className="label">Deadline</label>
            <input id="task-deadline" type="datetime-local" className="input" {...register('deadlineAt')} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              A WhatsApp reminder will be sent 24h before the deadline.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
