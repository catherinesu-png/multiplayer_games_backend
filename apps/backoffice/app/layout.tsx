import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Game Platform BackOffice',
  description: 'Admin console for the shared game platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
