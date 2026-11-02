import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monthly Cash Flow",
  description: "Money in, money out, and what is left each month.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
