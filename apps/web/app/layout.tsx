import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Metrix AI — 自主交易 Agent",
  description: "Monad Metropolis Hackathon · Track 01 · The agent that doesn't just chat — it trades.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0e17",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="page">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
