import Link from "next/link";
import { StudioNav } from "@/components/StudioNav";

export default function StudioHome() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">自媒体工作台</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          面向“中国古代史 × 现代热点”的工作流：收集热点、整理材料、生成对照卡与脚本。
        </p>
        <StudioNav />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/studio/hot"
          className="rounded-xl border border-black/10 p-5 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          <div className="text-sm font-medium">热点收集</div>
          <div className="mt-1 text-sm text-foreground/70">
            粘贴链接/关键词入库，自动补全标题与摘要（能抓就抓）。
          </div>
        </Link>
        <Link
          href="/studio/library"
          className="rounded-xl border border-black/10 p-5 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          <div className="text-sm font-medium">材料库</div>
          <div className="mt-1 text-sm text-foreground/70">
            史料/研究/解读统一管理，按朝代、人物、事件与维度检索。
          </div>
        </Link>
        <Link
          href="/studio/compare"
          className="rounded-xl border border-black/10 p-5 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          <div className="text-sm font-medium">对照卡</div>
          <div className="mt-1 text-sm text-foreground/70">
            从热点映射到历史相似事件，形成可复用的结构化卡片。
          </div>
        </Link>
        <Link
          href="/studio/script"
          className="rounded-xl border border-black/10 p-5 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
        >
          <div className="text-sm font-medium">脚本工厂</div>
          <div className="mt-1 text-sm text-foreground/70">
            按 10–12 分钟模板分段生成，段落旁附引用清单。
          </div>
        </Link>
      </div>
    </div>
  );
}

