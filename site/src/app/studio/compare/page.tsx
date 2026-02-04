import { CompareClient } from "@/app/studio/compare/CompareClient";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function ComparePage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="对照卡"
        description="把“热点 → 历史相似事件”结构化下来，后续脚本只需要引用对照卡即可。"
      />
      <CompareClient />
    </div>
  );
}

