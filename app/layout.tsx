import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cable Drop Portal',
  description: 'Field photo upload and searchable metadata portal for cable technicians and leadership.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
