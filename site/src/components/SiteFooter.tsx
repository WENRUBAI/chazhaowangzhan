export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-black/10 py-10 text-sm text-foreground/70 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4">
        <div>© {year} 自媒体工作台</div>
      </div>
    </footer>
  );
}

