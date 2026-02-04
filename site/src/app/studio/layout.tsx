import { StudioNav } from "@/components/StudioNav";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="sticky top-14 z-10 -mx-4 border-b border-border bg-background/70 px-4 py-3 backdrop-blur">
        <StudioNav />
      </div>
      {children}
    </div>
  );
}
