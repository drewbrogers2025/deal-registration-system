import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: "Deal Registration System",
  description: "Comprehensive deal registration system with conflict detection, built with Next.js, Supabase, and Google OAuth",
  keywords: ["deal registration", "conflict detection", "sales management", "CRM"],
  authors: [{ name: "Deal Registration Team" }],
  creator: "Deal Registration System",
  publisher: "Deal Registration System",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://deal-registration-system.vercel.app',
    title: 'Deal Registration System',
    description: 'Comprehensive deal registration system with conflict detection',
    siteName: 'Deal Registration System',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deal Registration System',
    description: 'Comprehensive deal registration system with conflict detection',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
