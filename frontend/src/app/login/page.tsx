import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign In | CampusCore',
  description: 'Sign in to CampusCore — your connected campus platform.',
};

export default function LoginPage() {
  return <LoginClient />;
}
