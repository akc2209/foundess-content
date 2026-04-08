import "./globals.css";
import React from "react";

export const metadata = {
  title: "Foundess Content Engine",
  description: "Internal content multiplier for Foundess",
  icons: { icon: "/favicon.png" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chivo:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <link href="https://fonts.cdnfonts.com/css/junicode" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
