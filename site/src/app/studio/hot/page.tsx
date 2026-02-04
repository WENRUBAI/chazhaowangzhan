import { HotInboxClient } from "@/app/studio/hot/HotInboxClient";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function HotPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title="热点收集箱"
        description="支持微博/抖音/微信/小红书/B站：先把热点快速收进来，再做历史对照与材料整理。"
      />
      <HotInboxClient />
    </div>
  );
}

