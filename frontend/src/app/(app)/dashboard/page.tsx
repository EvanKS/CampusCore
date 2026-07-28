import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your CampusCore dashboard — tasks, attendance, notices, and more.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
