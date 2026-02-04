import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-background/80 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/studio/hot" className="font-semibold tracking-tight">
          自媒体工作台
        </Link>
        <nav className="flex items-center gap-4 text-sm text-foreground/80">
          <Link href="/studio" className="hover:text-foreground">
            自媒体工作台
          </Link>
        </nav>
      </div>
    </header>
  );
}

