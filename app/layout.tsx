import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://familio-planer.michael217682.chatgpt.site'),
  title: 'Family Base – Gemeinsam organisiert',
  description: 'Der gemeinsame Planer für Termine, Einkäufe, Rezepte und Aufgaben.',
  icons: { icon: '/family-base-logo.png', apple: '/family-base-logo.png' },
  openGraph: {
    title: 'Family Base – Gemeinsam organisiert',
    description: 'Der gemeinsame Planer für Termine, Einkäufe, Rezepte und Aufgaben.',
    type: 'website',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Family Base – Gemeinsam organisiert',
    description: 'Der gemeinsame Planer für Termine, Einkäufe, Rezepte und Aufgaben.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="de" className="dark"><body className={`${geist.variable} ${mono.variable} antialiased`}>{children}</body></html>;
}
