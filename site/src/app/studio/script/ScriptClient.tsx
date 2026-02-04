"use client";

import { useMemo, useState } from "react";
import type { CompareCard, ScriptDraft, ScriptSegment } from "@/lib/studio/types";
import { nowIso, randomId } from "@/lib/studio/utils";

const STORAGE_SCRIPTS = "studio_script_drafts_v1";
const STORAGE_COMPARE = "studio_compare_cards_v1";

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function baseSegments(): ScriptSegment[] {
  return [
    { key: "hook", title: "开场钩子", targetSeconds: 30, text: "", citations: [] },
    { key: "hot", title: "热点概述", targetSeconds: 120, text: "", citations: [] },
    { key: "background", title: "历史背景", targetSeconds: 120, text: "", citations: [] },
    { key: "history", title: "核心史事", targetSeconds: 300, text: "", citations: [] },
    { key: "mapping", title: "映射到当下", targetSeconds: 120, text: "", citations: [] },
    { key: "closing", title: "结尾观点", targetSeconds: 60, text: "", citations: [] },
  ];
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function segmentsToMarkdown(draft: ScriptDraft): string {
  const total = draft.segments.reduce((sum, s) => sum + s.targetSeconds, 0);
  const lines: string[] = [];
  lines.push(`# ${draft.title}`);
  lines.push("");
  lines.push(`- 热点：${draft.topicTitle}`);
  lines.push(`- 目标时长：${formatSeconds(total)}（约 10–12 分钟）`);
  lines.push("");
  for (const seg of draft.segments) {
    lines.push(`## ${seg.title}（${formatSeconds(seg.targetSeconds)}）`);
    lines.push("");
    lines.push(seg.text || "（待补充）");
    lines.push("");
    if (seg.citations.length) {
      lines.push("引用：");
      for (const c of seg.citations) {
        lines.push(`- ${c.url ? `[${c.title}](${c.url})` : c.title}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

export function ScriptClient() {
  const [compareCards] = useState<CompareCard[]>(() =>
    loadJson<CompareCard[]>(STORAGE_COMPARE, []),
  );
  const [drafts, setDrafts] = useState<ScriptDraft[]>(() =>
    loadJson<ScriptDraft[]>(STORAGE_SCRIPTS, []),
  );

  const [topicTitle, setTopicTitle] = useState("");
  const [title, setTitle] = useState("");
  const [selectedCompareId, setSelectedCompareId] = useState<string>("");
  const [angle, setAngle] = useState("");

  const [hook, setHook] = useState("");
  const [hot, setHot] = useState("");
  const [background, setBackground] = useState("");
  const [history, setHistory] = useState("");
  const [mapping, setMapping] = useState("");
  const [closing, setClosing] = useState("");

  const [q, setQ] = useState("");

  const selectedCompare = useMemo(() => {
    return compareCards.find((c) => c.id === selectedCompareId) ?? null;
  }, [compareCards, selectedCompareId]);

  function onSelectCompare(id: string) {
    setSelectedCompareId(id);
    const c = compareCards.find((x) => x.id === id);
    if (!c) return;
    if (!topicTitle) setTopicTitle(c.topicTitle);
    if (!title) setTitle(`${c.topicTitle}：从${c.eventTitle}看今天`);
    if (!background && c.timeline) setBackground(c.timeline);
    if (!history && c.coreConflict)
      setHistory(`核心矛盾：${c.coreConflict}\n\n（补充史事细节）`);
  }

  const filteredDrafts = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return drafts;
    return drafts.filter((d) => {
      const hay = [d.title, d.topicTitle].join(" ").toLowerCase();
      return hay.includes(query);
    });
  }, [drafts, q]);

  function buildDraft(): ScriptDraft | null {
    const topic = topicTitle.trim();
    const t = (title || topic).trim();
    if (!topic || !t) return null;

    const base = baseSegments();
    const citations = selectedCompare?.sources ?? [];

    const segs: ScriptSegment[] = base.map((s) => {
      const text =
        s.key === "hook"
          ? hook
          : s.key === "hot"
            ? hot
            : s.key === "background"
              ? background
              : s.key === "history"
                ? history
                : s.key === "mapping"
                  ? mapping
                  : closing;

      const extra =
        s.key === "mapping" && angle.trim()
          ? `\n\n角度提示：${angle.trim()}`
          : "";

      return {
        ...s,
        text: (text || "").trim() + extra,
        citations: s.key === "history" || s.key === "background" ? citations : [],
      };
    });

    return {
      id: randomId("script"),
      title: t,
      topicTitle: topic,
      segments: segs,
      createdAt: nowIso(),
    };
  }

  function saveDraft() {
    const d = buildDraft();
    if (!d) return;
    const next = [d, ...drafts];
    setDrafts(next);
    saveJson(STORAGE_SCRIPTS, next);
  }

  function exportMarkdown(d: ScriptDraft) {
    const md = segmentsToMarkdown(d);
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${d.title}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function removeDraft(id: string) {
    const next = drafts.filter((x) => x.id !== id);
    setDrafts(next);
    saveJson(STORAGE_SCRIPTS, next);
  }

  const totalSeconds = useMemo(() => {
    return baseSegments().reduce((sum, s) => sum + s.targetSeconds, 0);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="topic">
              热点
            </label>
            <input
              id="topic"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="例如：某地限购政策争议"
              className="h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="title">
              脚本标题
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="用于发布的标题"
              className="h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="compare">
              引用对照卡（可选）
            </label>
            <select
              id="compare"
              value={selectedCompareId}
              onChange={(e) => onSelectCompare(e.target.value)}
              className="h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">不选择</option>
              {compareCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.topicTitle} → {c.eventTitle}
                </option>
              ))}
            </select>
            <div className="text-xs text-foreground/60">
              选择对照卡后，会把来源引用自动带到“历史背景/核心史事”段落。
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="angle">
              角度（可选）
            </label>
            <input
              id="angle"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="例如：财政压力下的国家干预，历史上通常带来哪些连锁反应？"
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">开场钩子（0:30）</label>
              <textarea
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                className="min-h-24 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">热点概述（2:00）</label>
              <textarea
                value={hot}
                onChange={(e) => setHot(e.target.value)}
                className="min-h-24 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">历史背景（2:00）</label>
              <textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="min-h-28 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">核心史事（5:00）</label>
              <textarea
                value={history}
                onChange={(e) => setHistory(e.target.value)}
                className="min-h-28 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">映射到当下（2:00）</label>
              <textarea
                value={mapping}
                onChange={(e) => setMapping(e.target.value)}
                className="min-h-24 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">结尾观点（1:00）</label>
              <textarea
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                className="min-h-24 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-foreground/60">
            模板总时长：{formatSeconds(totalSeconds)}（约 10–12 分钟）。
          </div>
          <button
            type="button"
            onClick={saveDraft}
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
          >
            保存脚本草稿
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="search">
            搜索草稿
          </label>
          <input
            id="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 rounded-lg border border-border bg-surface px-3 text-sm outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div className="text-sm text-foreground/60">共 {filteredDrafts.length} 份草稿</div>

      <div className="grid gap-3">
        {filteredDrafts.map((d) => (
          <div
            key={d.id}
            className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{d.title}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                  <span>{new Date(d.createdAt).toLocaleString()}</span>
                  <span>热点：{d.topicTitle}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportMarkdown(d)}
                  className="h-9 rounded-lg border border-border bg-muted px-3 text-xs font-medium hover:bg-muted/70"
                >
                  导出 MD
                </button>
                <button
                  type="button"
                  onClick={() => removeDraft(d.id)}
                  className="h-9 rounded-lg border border-border bg-muted px-3 text-xs font-medium hover:bg-muted/70"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

