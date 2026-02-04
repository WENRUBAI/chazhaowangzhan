import { StudioNav } from "@/components/StudioNav";
import {
  isNotionConfigured,
  listNotionHotTopics,
  listNotionMaterials,
} from "@/lib/notion";
import { PLATFORMS } from "@/lib/studio/types";

export default async function NotionPage() {
  const enabled = isNotionConfigured();
  const [hots, materials] = enabled
    ? await Promise.all([listNotionHotTopics(20), listNotionMaterials(20)])
    : [[], []];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Notion 内容库</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          用 Notion 作为云端材料库：你在 Notion 里编辑，网站负责检索/展示/组装脚本。
          当前版本为静态站：Notion 内容会在重新部署/重新构建时更新。
        </p>
        <StudioNav />
      </div>

      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div className="text-sm font-medium">配置状态</div>
        <div className="mt-1 text-sm text-foreground/70">
          {enabled
            ? "已检测到 NOTION_TOKEN（可读取 Notion 数据库）"
            : "未检测到 NOTION_TOKEN（仅显示本地存储数据）"}
        </div>
        <div className="mt-3 text-xs text-foreground/60">
          需要配置环境变量：
          <div className="mt-1 rounded-lg bg-black/5 px-3 py-2 font-mono text-[11px] leading-5 dark:bg-white/10">
            NOTION_TOKEN
            <br />
            NOTION_HOT_DB_ID
            <span className="text-foreground/40">（或 NOTION_HOT_DATA_SOURCE_ID）</span>
            <br />
            NOTION_MATERIAL_DB_ID
            <span className="text-foreground/40">
              （或 NOTION_MATERIAL_DATA_SOURCE_ID）
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-medium">热点（最近 20 条）</div>
            <div className="text-xs text-foreground/60">来自 Notion</div>
          </div>
          <div className="mt-3 grid gap-3">
            {hots.length ? (
              hots.map((h) => (
                <div key={h.id} className="rounded-lg bg-black/5 p-3 dark:bg-white/10">
                  <div className="text-sm font-semibold">{h.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                    <span>{new Date(h.createdAt).toLocaleString()}</span>
                    {h.platform ? (
                      <span>
                        平台：
                        {PLATFORMS.find((p) => p.value === h.platform)?.label ??
                          h.platform}
                      </span>
                    ) : null}
                    {h.url ? (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:text-foreground"
                      >
                        链接
                      </a>
                    ) : null}
                  </div>
                  {h.summary ? (
                    <div className="mt-2 text-sm text-foreground/70">
                      {h.summary}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-sm text-foreground/60">
                {enabled ? "未读取到数据（检查数据库 ID 与字段名）" : "未启用 Notion"}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-medium">材料（最近 20 条）</div>
            <div className="text-xs text-foreground/60">来自 Notion</div>
          </div>
          <div className="mt-3 grid gap-3">
            {materials.length ? (
              materials.map((m) => (
                <div key={m.id} className="rounded-lg bg-black/5 p-3 dark:bg-white/10">
                  <div className="text-sm font-semibold">{m.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                    <span>{m.sourceType}</span>
                    <span>可信度：{m.credibility}</span>
                    {m.dynasties.length ? (
                      <span>朝代：{m.dynasties.join(" / ")}</span>
                    ) : null}
                    {m.url ? (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:text-foreground"
                      >
                        链接
                      </a>
                    ) : null}
                  </div>
                  {m.excerpt ? (
                    <div className="mt-2 line-clamp-3 text-sm text-foreground/70">
                      {m.excerpt}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-sm text-foreground/60">
                {enabled ? "未读取到数据（检查数据库 ID 与字段名）" : "未启用 Notion"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

