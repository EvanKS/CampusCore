'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  category?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
  showAnnouncement?: boolean;
  announcementText?: string;
}

export function PageHeader({
  title,
  category = 'Home',
  breadcrumb,
  actions,
  showAnnouncement = true,
  announcementText = "Campus activities and academic results are on track. Let's aim even higher! 🚀",
}: PageHeaderProps) {
  const currentBreadcrumb = breadcrumb || title;

  return (
    <div className="space-y-3 mb-6">
      {/* Top Header Row with Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-lg shadow-sm border border-purple-200/50">
            {title.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5" aria-label="Breadcrumb">
              <Link href="/dashboard" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                {category}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-purple-700 dark:text-purple-300 font-bold">{currentBreadcrumb}</span>
            </nav>
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Dark Announcement / Status Strip inspired by reference dashboard */}
      {showAnnouncement && (
        <div className="bg-slate-900 dark:bg-slate-950 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5 shadow-sm">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 animate-pulse-subtle" />
          <span className="truncate text-slate-200">{announcementText}</span>
        </div>
      )}
    </div>
  );
}
