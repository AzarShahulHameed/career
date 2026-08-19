import type { Metadata } from 'next';
import './globals.css';
import { LaunchSplash } from '@/components/LaunchSplash';

export const metadata: Metadata = {
  title: 'Catapult Careers',
  description: 'Applicant tracking, done right.',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <LaunchSplash />
        {children}
      </body>
    </html>
  );
}
