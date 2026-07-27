import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign In | CampusFlow',
  description: 'Sign in to CampusFlow — your campus productivity platform.',
};

export default function LoginPage() {
  return <LoginClient />;
}
