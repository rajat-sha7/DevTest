import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { JsonLd } from "@/components/JsonLd";
import { ANNOUNCE_HIDE_SCRIPT } from "@/lib/announce";
import { Mascot } from "@/components/landing/mascot";
import { PageTransitions } from "@/components/PageTransitions";
import { ALL_QUESTIONS, TOPICS } from "@/lib/questions";
import { SITE } from "@/lib/site";
import { graph, organization, website } from "@/lib/schema";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "education",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: "/",
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "default" },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : {}),
          ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
            ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
            : {}),
        },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  width: "device-width",
  initialScale: 1,
};

const siteSchema = graph(organization(), website());

// Qubi's question pool: a small fixed sample (6 easy/medium per topic) keeps the client payload tiny
const mascotQuestions = TOPICS.flatMap((t) =>
  ALL_QUESTIONS.filter((q) => q.topic === t.id && q.difficulty !== "Hard")
    .slice(0, 6)
    .map((q) => ({ id: q.id, topic: q.topic, question: q.question }))
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // the inline script below may mark <html> before React hydrates
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=PT+Sans:wght@400;700&family=Source+Code+Pro:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <JsonLd data={siteSchema} />
        <script dangerouslySetInnerHTML={{ __html: ANNOUNCE_HIDE_SCRIPT }} />
      </head>
      <body className="font-body bg-background text-foreground antialiased">
        <PageTransitions />
        {children}
        <Mascot questions={mascotQuestions} />
        <Toaster />
      </body>
    </html>
  );
}
