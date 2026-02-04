import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/studio/hot" className="font-semibold tracking-tight text-foreground">
          自媒体工作台
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/studio"
            className="rounded-lg px-2 py-1 text-foreground/70 hover:bg-muted hover:text-foreground"
          >
            自媒体工作台
          </Link>
        </nav>
      </div>
    </header>
  );
}

