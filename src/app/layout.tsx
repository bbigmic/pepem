import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { WalletContextProvider } from "@/contexts/WalletContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Rooms",
  description: "Create rooms for AI conversations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="fixed top-4 left-4 z-50">
          <Link href="/" aria-label="Home">
            <Image
              src="/logo_pepem_ai_no_bg.png"
              alt="PEPEM AI logo"
              width={56}
              height={56}
              priority
            />
          </Link>
        </div>
        <WalletContextProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
