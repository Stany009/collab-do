import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CollabDo - Shared To-Do Lists",
  description: "A real-time collaborative to-do list with dynamic themes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="overflow-x-hidden w-full max-w-full">{children}</body>
    </html>
  );
}
