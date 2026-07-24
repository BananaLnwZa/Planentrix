import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sansation = localFont({
  src: [
    {
      path: "./fonts/Sansation-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Sansation-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-sansation",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Planentrix Admin - Schedule Planner",
  description: "Planentrix administration and schedule management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sansation.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
