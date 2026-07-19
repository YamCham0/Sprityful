import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FrameFoundry — game-ready sprites from a prompt",
  description:
    "Create original pixel-art characters and sprite sheets, then download the assets and starter metadata for your game.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
