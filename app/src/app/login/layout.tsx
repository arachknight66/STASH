import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login — STASH',
  description: 'Log in or sign up to your STASH personal finance vault.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
