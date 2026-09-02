import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Familio – Gemeinsam organisiert',
  description: 'Der gemeinsame Planer für Termine, Einkäufe, Rezepte und Aufgaben.',
  openGraph: {
    title: 'Familio – Gemeinsam organisiert',
    description: 'Der gemeinsame Planer für Termine, Einkäufe, Rezepte und Aufgaben.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Familio – Gemeinsam organisiert',
    description: 'Der gemeinsame Planer für Termine, Einkäufe, Rezepte und Aufgaben.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de" className="dark"><body className={`${geist.variable} ${mono.variable} antialiased`}>{children}</body></html>;
}
