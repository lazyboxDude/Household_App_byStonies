import type { Metadata } from "next";
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
