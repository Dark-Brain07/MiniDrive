import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniDrive - DePIN Storage",
  description: "DePIN storage network for MiniPay.",
};

import Providers from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
