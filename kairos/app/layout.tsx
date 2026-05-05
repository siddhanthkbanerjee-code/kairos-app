import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import KairosChrome from "./components/KairosChrome";

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kairos — Find your perfect moment in London",
  description:
    "Take an 8-question taste quiz and let AI discover your perfect London events. Personalised match scores, AI explanations, and zero noise.",
  openGraph: {
    title: "Kairos — Find your perfect moment",
    description:
      "Eight questions. A hundred signals. Your nights in London, discovered for you.",
    siteName: "Kairos",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Kairos — Find your perfect moment",
    description:
      "Eight questions. A hundred signals. Your nights in London, discovered for you.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${playfair.variable} antialiased`}
      >
        <KairosChrome>{children}</KairosChrome>
      </body>
    </html>
  );
}
