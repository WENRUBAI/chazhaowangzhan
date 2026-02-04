export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border py-10 text-sm text-foreground/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4">
        <div>© {year} 自媒体工作台</div>
      </div>
    </footer>
  );
}

