import { StudioNav } from "@/components/StudioNav";
import { HotInboxClient } from "@/app/studio/hot/HotInboxClient";

export default function HotPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">热点收集箱</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          支持微博/抖音/微信/小红书/B站：先把热点快速收进来，再做历史对照与材料整理。
        </p>
        <StudioNav />
      </div>
      <HotInboxClient />
    </div>
  );
}

