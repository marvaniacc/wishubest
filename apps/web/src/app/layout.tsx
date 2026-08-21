import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "WishUBest — Medical Travel, Simplified",
  description:
    "Discover trusted doctors, hospitals, translators and hotels worldwide. Book, pay securely and travel with confidence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
