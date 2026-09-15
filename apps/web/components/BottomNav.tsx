"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "🏠", label: "金库" },
  { href: "/trade", icon: "⚡", label: "交易" },
  { href: "/portfolio", icon: "📊", label: "持仓" },
  { href: "/chat", icon: "💬", label: "指令" },
  { href: "/settings", icon: "⚙️", label: "设置" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      <div className="nav-inner">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={`nav-item${pathname === it.href ? " active" : ""}`}>
            <span className="ico">{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
