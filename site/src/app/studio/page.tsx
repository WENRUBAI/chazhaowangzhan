import { SectionHeader } from "@/components/ui/SectionHeader";
import { HeroGlow } from "@/components/ui/HeroGlow";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export default function StudioHome() {
  return (
    <div className="relative flex flex-col gap-8">
      <HeroGlow />
      
      <SectionHeader
        title="自媒体工作台"
        description="面向“中国古代史 × 现代热点”的工作流：收集热点、整理材料、生成对照卡与脚本。"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SpotlightCard href="/studio/hot">
          <div className="text-sm font-medium">热点收集</div>
          <div className="mt-1 text-sm text-foreground/60">
            粘贴链接/关键词入库，自动补全标题与摘要（能抓就抓）。
          </div>
        </SpotlightCard>

        <SpotlightCard href="/studio/library">
          <div className="text-sm font-medium">材料库</div>
          <div className="mt-1 text-sm text-foreground/60">
            史料/研究/解读统一管理，按朝代、人物、事件与维度检索。
          </div>
        </SpotlightCard>

        <SpotlightCard href="/studio/compare">
          <div className="text-sm font-medium">对照卡</div>
          <div className="mt-1 text-sm text-foreground/60">
            从热点映射到历史相似事件，形成可复用的结构化卡片。
          </div>
        </SpotlightCard>

        <SpotlightCard href="/studio/script">
          <div className="text-sm font-medium">脚本工厂</div>
          <div className="mt-1 text-sm text-foreground/60">
            按 10–12 分钟模板分段生成，段落旁附引用清单。
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
