import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Legal Docling",
  description: "Conversor jurídico a Markdown con chunking semántico."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
