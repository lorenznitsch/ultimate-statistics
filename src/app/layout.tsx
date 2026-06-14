import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Hucks H2H",
  description: "Head-to-Head-Vergleiche deutscher Ultimate-Frisbee-Vereine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col bg-white text-gray-900 antialiased">
        <NavBar />
        <main className="flex-1 container mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400">
          Hucks H2H · Daten von der DFBD · Kein offizielles Angebot
        </footer>
      </body>
    </html>
  );
}
