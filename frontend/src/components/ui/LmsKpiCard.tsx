'use client';

import React from 'react';
import Link from 'next/link';

export interface LmsKpiCardProps {
  value: string | number;
  label: string;
  percentage?: number;
  progressText?: string;
  href?: string;
  variant: 'magenta' | 'purple' | 'blue' | 'cyan' | 'green';
  icon?: React.ReactNode;
}

const variantStyles = {
  magenta: {
    bg: 'bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600',
    text: 'text-white',
    ringColor: 'stroke-white',
    subText: 'text-pink-100',
    barBg: 'bg-pink-300/40',
    barFill: 'bg-white',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700',
    text: 'text-white',
    ringColor: 'stroke-white',
    subText: 'text-purple-100',
    barBg: 'bg-purple-300/40',
    barFill: 'bg-white',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700',
    text: 'text-white',
    ringColor: 'stroke-white',
    subText: 'text-blue-100',
    barBg: 'bg-blue-300/40',
    barFill: 'bg-white',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-600',
    text: 'text-white',
    ringColor: 'stroke-white',
    subText: 'text-cyan-100',
    barBg: 'bg-cyan-300/40',
    barFill: 'bg-white',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-600',
    text: 'text-white',
    ringColor: 'stroke-white',
    subText: 'text-emerald-100',
    barBg: 'bg-emerald-300/40',
    barFill: 'bg-white',
  },
};

export function LmsKpiCard({
  value,
  label,
  percentage = 75,
  progressText,
  href,
  variant,
  icon,
}: LmsKpiCardProps) {
  const style = variantStyles[variant] || variantStyles.purple;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(percentage, 100)) / 100;

  const content = (
    <div className={`p-5 rounded-2xl ${style.bg} ${style.text} shadow-md relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black tracking-tight">{value}</span>
            {icon && <span className="p-1 rounded-lg bg-white/20">{icon}</span>}
          </div>
          <p className={`text-xs font-bold ${style.subText} uppercase tracking-wider mt-0.5`}>{label}</p>
        </div>

        {/* Circular Ring Indicator */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-14 h-14 transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r={radius}
              stroke="currentColor"
              strokeWidth="4"
              className="opacity-25"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <span className="absolute text-[11px] font-black text-white">{percentage}%</span>
        </div>
      </div>

      {/* Subtle Progress Bar line */}
      <div className={`w-full h-1.5 rounded-full ${style.barBg} overflow-hidden mt-2`}>
        <div
          className={`h-full rounded-full ${style.barFill} transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {progressText && (
        <p className={`text-[10px] font-bold ${style.subText} mt-1.5 truncate`}>{progressText}</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
