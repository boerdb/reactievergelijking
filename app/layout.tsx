import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Reactievergelijkingen — Controleer & Kopieer",
  description:
    "Voer een scheikundige reactievergelijking in, controleer of hij klopt, en kopieer hem naar Word voor je huiswerk.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "512x512", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    // "default" = ondoorzichtige statusbalk, zodat content niet door klok/batterij loopt.
    // (black-translucent tekent de pagina onder de statusbalk door.)
    statusBarStyle: "default",
    title: "Reacties",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
