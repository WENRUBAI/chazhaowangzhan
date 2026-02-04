import { StudioNav } from "@/components/StudioNav";
import { CompareClient } from "@/app/studio/compare/CompareClient";

export default function ComparePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">对照卡</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          把“热点 → 历史相似事件”结构化下来，后续脚本只需要引用对照卡即可。
        </p>
        <StudioNav />
      </div>
      <CompareClient />
    </div>
  );
}

