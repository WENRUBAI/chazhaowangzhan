import { StudioNav } from "@/components/StudioNav";
import { LibraryClient } from "@/app/studio/library/LibraryClient";

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">材料库</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          把史料/研究/解读集中管理，并按朝代、人物、事件与相似维度检索。
        </p>
        <StudioNav />
      </div>
      <LibraryClient />
    </div>
  );
}

