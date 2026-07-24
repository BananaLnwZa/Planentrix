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

const fcDaisy = localFont({
  src: "./fonts/FC Daisy Regular ver 1.00.otf",
  variable: "--font-fc-daisy",
  weight: "400",
  style: "normal",
  display: "swap",
});

const pacifico = localFont({
  src: "./fonts/Pacifico.ttf",
  variable: "--font-pacifico",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Planentrix - Schedule Planner",
  description: "Smart schedule planning and time management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sansation.variable} ${fcDaisy.variable} ${pacifico.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
