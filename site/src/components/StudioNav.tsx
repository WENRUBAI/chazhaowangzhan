import Link from "next/link";

const items: Array<{ href: string; label: string }> = [
  { href: "/studio/hot", label: "热点收集" },
  { href: "/studio/library", label: "材料库" },
  { href: "/studio/compare", label: "对照卡" },
  { href: "/studio/script", label: "脚本工厂" },
  { href: "/studio/notion", label: "Notion" },
];

export function StudioNav() {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="rounded-full border border-black/10 px-3 py-1 text-sm text-foreground/80 hover:bg-black/5 hover:text-foreground dark:border-white/10 dark:hover:bg-white/10"
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

