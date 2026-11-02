import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Yaad — Never lose what matters",
  description: "Web-first AI memory assistant for belongings tracking and proactive departure reminders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ivory-100 text-charcoal-900 selection:bg-sage-200 selection:text-forest-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
