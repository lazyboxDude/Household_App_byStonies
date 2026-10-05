import type { Metadata, Viewport } from "next";
import { Caveat, Nunito } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "./context/AuthContext";
import "./globals.css";

// Friendly rounded body text + a handwritten face for headings and numbers.
const body = Nunito({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  title: "Our Home Base",
  description: "A collaborative household management app for couples",
  appleWebApp: {
    title: "Home Base",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efe0" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1914" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${body.variable} ${hand.variable}`}>
      <body className="antialiased min-h-screen flex flex-col md:flex-row">
        <AuthProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen min-w-0">
            <main className="flex-1 page-scroll-pad">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
