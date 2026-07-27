import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Register | CampusFlow',
  description: 'Create your CampusFlow account to get started.',
};

export default function RegisterPage() {
  return <RegisterClient />;
}
