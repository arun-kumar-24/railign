import type { Metadata } from 'next';
import './globals.css';
import { DepotProvider } from '../lib/depot-context';

export const metadata: Metadata = {
  title: 'DepotOS — Stabling Optimization System',
  description: 'Rail depot fleet management and stabling optimizer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DepotProvider>
          {children}
        </DepotProvider>
      </body>
    </html>
  );
}