import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL((() => {
    const raw = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    if (!raw) return 'https://mind-palace.vercel.app'
    return raw.startsWith('http') ? raw : `https://${raw}`
  })()),
  title: "Mind Palace",
  description: "A depository of intellectual work. Discover unique ways people explain ideas.",
  openGraph: {
    title: "Mind Palace",
    description: "A depository of intellectual work. Discover unique ways people explain ideas.",
    images: [{ url: '/logo.png', width: 1080, height: 1080 }],
  },
  twitter: {
    card: 'summary',
    title: "Mind Palace",
    description: "A depository of intellectual work. Discover unique ways people explain ideas.",
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${geist.className} min-h-full bg-white text-neutral-900`}>
        {children}
      </body>
    </html>
  );
}
