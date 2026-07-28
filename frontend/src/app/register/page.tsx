import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Register | CampusCore',
  description: 'Create your CampusCore account to get started.',
};

export default function RegisterPage() {
  return <RegisterClient />;
}
