import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accessible Strategies — Digital Accessibility Consulting",
  description: "We help organizations build digital products that work for everyone — not just users who fit a narrow default.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        {children}
      </body>
    </html>
  );
}