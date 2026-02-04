"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";

const items: Array<{ href: string; label: string }> = [
  { href: "/studio/hot", label: "热点收集" },
  { href: "/studio/library", label: "材料库" },
  { href: "/studio/compare", label: "对照卡" },
  { href: "/studio/script", label: "脚本工厂" },
  { href: "/studio/notion", label: "Notion" },
  { href: "/studio/reader", label: "阅读器" },
];

export function StudioNav() {
  const pathname = usePathname() || "";

  return (
    <nav className="sticky top-[72px] z-20 flex w-full items-center gap-1 overflow-x-auto whitespace-nowrap rounded-xl border border-white/5 bg-black/20 p-1 backdrop-blur-xl">
      {items.map((it) => {
        const isActive =
          pathname === it.href ||
          pathname === `${it.href}/` ||
          pathname.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-white/10 text-white shadow-glow"
                : "text-white/50 hover:bg-white/5 hover:text-white/90",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
