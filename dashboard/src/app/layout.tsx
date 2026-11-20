import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentPulse",
  description: "Early-talent voice and retention signals for HR, powered by weekly Slack check-ins.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://assets.phenompeople.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
