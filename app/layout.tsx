import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import NextAuthSessionProvider from "./context/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Home Base",
  description: "A collaborative household management app for couples",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col md:flex-row">
        <NextAuthSessionProvider>
          <AuthProvider>
            <div className="flex-1 flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 pb-16 md:pb-0">
                {children}
              </main>
            </div>
          </AuthProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
