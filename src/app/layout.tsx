import type { Metadata } from "next";
import "./globals.css";

/**
 * Application metadata export.
 */
export const metadata: Metadata = {
  title: "MiniDrive - DePIN Storage",
  description: "DePIN storage network for MiniPay.",
  other: {
    "talentapp:project_verification": "a9877b769725facd7e8fe1bf2014f86c2a27d00c8f83748922c14ec88697fa71b4ad506b5b9a7197bae118e5d687edea4d5980c40148a1f92aa8d38668dc5902"
  }
};

import Providers from "@/components/Providers";

/**
 * Main application layout wrapper.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" aria-label="Main Application" role="application">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
