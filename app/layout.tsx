import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reactievergelijkingen — Controleer & Kopieer",
  description:
    "Voer een scheikundige reactievergelijking in, controleer of hij klopt, en kopieer hem naar Word voor je huiswerk.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
