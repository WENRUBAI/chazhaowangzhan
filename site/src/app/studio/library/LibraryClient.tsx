"use client";

import { useEffect, useMemo, useState } from "react";
import type { Credibility, Dynasty, Material, SourceType } from "@/lib/studio/types";
import {
  CREDIBILITY_LEVELS,
  DYNASTIES,
  DIMENSIONS,
  SOURCE_TYPES,
  type SimilarityDimension,
} from "@/lib/studio/types";
import { matchMaterials } from "@/lib/studio/match";
import type { ClassicalSearchResult } from "@/lib/studio/search";
import { CLASSICAL_SITES, classicalSearchWithExcerpts } from "@/lib/studio/search";
import { nowIso, randomId } from "@/lib/studio/utils";

const STORAGE_KEY = "studio_materials_v1";
const STORAGE_CLASSICAL_SITE_IDS = "studio_classical_site_ids_v1";

function loadClassicalSiteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_CLASSICAL_SITE_IDS);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? data.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveClassicalSiteIds(ids: string[]) {
  window.localStorage.setItem(STORAGE_CLASSICAL_SITE_IDS, JSON.stringify(ids));
}

function toReaderHref(url?: string): string | undefined {
  const u = String(url ?? "").trim();
  if (!u) return undefined;
  return `/studio/reader?url=${encodeURIComponent(u)}`;
}

function isSlowHost(url?: string): boolean {
  try {
    const u = new URL(String(url ?? ""));
    return u.hostname === "zh.wikisource.org";
  } catch {
    return false;
  }
}

function loadFromStorage(): Material[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as Material[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: Material[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function splitList(input: string): string[] {
  return input
    .split(/[,\n，]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function LibraryClient() {
  const [items, setItems] = useState<Material[]>([]);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>("解读");
  const [credibility, setCredibility] = useState<Credibility>("中");
  const [dynasties, setDynasties] = useState<Dynasty[]>([]);
  const [peopleInput, setPeopleInput] = useState("");
  const [eventsInput, setEventsInput] = useState("");
  const [dimensions, setDimensions] = useState<SimilarityDimension[]>([]);
  const [excerpt, setExcerpt] = useState("");
  const [notes, setNotes] = useState("");

  const [filterDynasty, setFilterDynasty] = useState<Dynasty | "全部">("全部");
  const [q, setQ] = useState("");
  const [matchQ, setMatchQ] = useState("");
  const [webQ, setWebQ] = useState("");
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webResults, setWebResults] = useState<ClassicalSearchResult[]>([]);
  const [classicalSiteIds, setClassicalSiteIds] = useState<string[]>(() => {
    const saved = loadClassicalSiteIds();
    if (saved.length) return saved;
    return CLASSICAL_SITES.filter((s) => s.enabledByDefault).map((s) => s.id);
  });
  const classicalHosts = useMemo(() => {
    const enabled = new Set(classicalSiteIds);
    return CLASSICAL_SITES.filter((s) => enabled.has(s.id)).flatMap((s) => s.hosts);
  }, [classicalSiteIds]);

  useEffect(() => {
    setItems(loadFromStorage());
  }, []);

  async function fetchTitleFromUrl(targetUrl: string) {
    setLoadingTitle(true);
    setTitleError(null);
    try {
      const resp = await fetch(`https://r.jina.ai/${targetUrl}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const extracted =
        text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ??
        text.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
        undefined;
      if (!title && extracted) setTitle(extracted);
    } catch (e) {
      setTitleError(e instanceof Error ? e.message : "获取失败");
    } finally {
      setLoadingTitle(false);
    }
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((m) => {
      if (filterDynasty !== "全部" && !m.dynasties.includes(filterDynasty))
        return false;
      if (!query) return true;
      const hay = [
        m.title,
        m.url ?? "",
        m.citation?.work ?? "",
        m.citation?.locator ?? "",
        m.citation?.canonicalUrl ?? "",
        m.sourceType,
        m.credibility,
        m.dynasties.join(" "),
        m.people.join(" "),
        m.events.join(" "),
        m.dimensions.join(" "),
        m.excerpt ?? "",
        m.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [items, filterDynasty, q]);

  const autoMatches = useMemo(() => {
    const query = matchQ.trim();
    if (!query) return [];
    return matchMaterials(query, items, { limit: 10 });
  }, [items, matchQ]);

  async function runWebSearch() {
    const query = webQ.trim();
    if (!query) return;
    setWebLoading(true);
    setWebError(null);
    try {
      const results = await classicalSearchWithExcerpts(query, {
        limit: 12,
        hosts: classicalHosts,
      });
      setWebResults(results);
    } catch (e) {
      setWebError(e instanceof Error ? e.message : "搜索失败");
      setWebResults([]);
    } finally {
      setWebLoading(false);
    }
  }

  function saveSearchResultAsMaterial(r: ClassicalSearchResult) {
    const citation = r.citation;
    const displayTitle = citation
      ? `${citation.work}${citation.locator ? ` · ${citation.locator}` : ""}`
      : r.title;
    const t = displayTitle.trim();
    if (!t) return;
    const newItem: Material = {
      id: randomId("mat"),
      title: t,
      url: citation?.canonicalUrl || r.url || undefined,
      citation: citation
        ? {
            work: citation.work,
            locator: citation.locator,
            canonicalUrl: citation.canonicalUrl,
          }
        : undefined,
      sourceType: "史料",
      credibility: "高",
      dynasties: [],
      people: [],
      events: [],
      dimensions: [],
      excerpt: r.quote?.trim() || undefined,
      notes: [
        webQ.trim() ? `古籍搜索：${webQ.trim()}` : "",
        r.cacheText ? `【文字版】\n${r.cacheText.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n") || undefined,
      createdAt: nowIso(),
    };

    const existed = new Set(items.map((x) => (x.url ? `u:${x.url}` : `t:${x.title}`)));
    const key = newItem.url ? `u:${newItem.url}` : `t:${newItem.title}`;
    if (existed.has(key)) return;

    const next = [newItem, ...items];
    setItems(next);
    saveToStorage(next);
  }

  function toggleClassicalSite(id: string) {
    setClassicalSiteIds((prev) => {
      const existed = new Set(prev);
      if (existed.has(id)) existed.delete(id);
      else existed.add(id);
      const next = [...existed];
      saveClassicalSiteIds(next);
      return next;
    });
  }

  function toggleDynasty(d: Dynasty) {
    setDynasties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function toggleDimension(dim: SimilarityDimension) {
    setDimensions((prev) =>
      prev.includes(dim) ? prev.filter((x) => x !== dim) : [...prev, dim],
    );
  }

  function addItem() {
    const t = title.trim();
    if (!t) return;
    const newItem: Material = {
      id: randomId("mat"),
      title: t,
      url: url.trim() || undefined,
      sourceType,
      credibility,
      dynasties,
      people: splitList(peopleInput),
      events: splitList(eventsInput),
      dimensions,
      excerpt: excerpt.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: nowIso(),
    };
    const next = [newItem, ...items];
    setItems(next);
    saveToStorage(next);
    setTitle("");
    setUrl("");
    setSourceType("解读");
    setCredibility("中");
    setDynasties([]);
    setPeopleInput("");
    setEventsInput("");
    setDimensions([]);
    setExcerpt("");
    setNotes("");
  }

  function removeItem(id: string) {
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    saveToStorage(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div className="text-sm font-semibold">自动匹配</div>
        <div className="mt-0.5 text-xs text-foreground/60">
          输入热点标题/摘要/关键词，系统会从材料库里自动推荐最相关的资料。
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={matchQ}
            onChange={(e) => setMatchQ(e.target.value)}
            placeholder="例如：地方财政吃紧、税负争议、舆论发酵"
            className="h-11 flex-1 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
          <button
            type="button"
            onClick={() => setMatchQ("")}
            className="h-11 rounded-lg border border-black/10 px-4 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            清空
          </button>
        </div>

        {matchQ.trim() ? (
          <div className="mt-4 grid gap-2">
            {autoMatches.length ? (
              autoMatches.map((m) => (
                <div
                  key={m.material.id}
                  className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/10"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{m.material.title}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                        <span>
                          {m.material.sourceType} / {m.material.credibility}
                        </span>
                        <span>相关度：{m.score}</span>
                        {m.material.url ? (
                          <a
                            href={m.material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:text-foreground"
                          >
                            打开
                          </a>
                        ) : null}
                      </div>
                      {(m.reason.tokens.length ||
                        m.reason.dimensions.length ||
                        m.reason.dynasties.length) ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.reason.tokens.slice(0, 8).map((t) => (
                            <span
                              key={`${m.material.id}:${t}`}
                              className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-foreground/70 dark:border-white/10"
                            >
                              {t}
                            </span>
                          ))}
                          {m.reason.dimensions.map((d) => (
                            <span
                              key={`${m.material.id}:${d}`}
                              className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-foreground/70 dark:border-white/10"
                            >
                              {d}
                            </span>
                          ))}
                          {m.reason.dynasties.map((d) => (
                            <span
                              key={`${m.material.id}:${d}`}
                              className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-foreground/70 dark:border-white/10"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQ(m.material.title)}
                      className="h-9 shrink-0 self-start rounded-lg border border-black/10 px-3 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    >
                      用作搜索
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-foreground/60">
                没有匹配到材料。可以先用下面的表单入库更多资料，再回来匹配。
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div className="text-sm font-semibold">在线搜索古籍原文</div>
        <div className="mt-0.5 text-xs text-foreground/60">
          只检索古籍站点，并尽量解析“书名/卷篇章节”，同时抓取原文摘录。
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CLASSICAL_SITES.map((s) => {
            const on = classicalSiteIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleClassicalSite(s.id)}
                className={
                  on
                    ? "rounded-full bg-foreground px-2 py-0.5 text-xs text-background"
                    : "rounded-full border border-black/10 px-2 py-0.5 text-xs text-foreground/70 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={webQ}
            onChange={(e) => setWebQ(e.target.value)}
            placeholder="例如：地方债 财政压力 历史 类比"
            className="h-11 flex-1 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
          <button
            type="button"
            onClick={runWebSearch}
            disabled={!webQ.trim() || webLoading}
            className="h-11 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {webLoading ? "搜索中" : "搜索"}
          </button>
        </div>
        {webError ? (
          <div className="mt-2 text-xs text-foreground/60">搜索失败：{webError}</div>
        ) : null}
        {webResults.length ? (
          <div className="mt-4 grid gap-2">
            {webResults.map((r) => (
              <div
                key={r.citation?.canonicalUrl ?? r.url ?? r.title}
                className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {r.citation
                        ? `${r.citation.work}${r.citation.locator ? ` · ${r.citation.locator}` : ""}`
                        : r.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                      {r.citation?.canonicalUrl || r.url ? (
                        <>
                          <a
                            href={toReaderHref(r.citation?.canonicalUrl ?? r.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate hover:text-foreground"
                          >
                            阅读版
                          </a>
                          {!isSlowHost(r.citation?.canonicalUrl ?? r.url) ? (
                            <a
                              href={r.citation?.canonicalUrl ?? r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate hover:text-foreground"
                            >
                              原站
                            </a>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    {r.quote ? (
                      <div className="mt-2 line-clamp-3 text-xs text-foreground/60">
                        {r.quote}
                      </div>
                    ) : r.note ? (
                      <div className="mt-2 text-xs text-foreground/60">{r.note}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => saveSearchResultAsMaterial(r)}
                    className="h-9 shrink-0 self-start rounded-lg border border-black/10 px-3 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                  >
                    保存为史料
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="title">
              标题
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：《盐铁论》里的财政争论"
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="url">
              来源链接（可选）
            </label>
            <div className="flex gap-2">
              <input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="论文/书评/公众号文章/视频链接…"
                className="h-11 flex-1 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
              />
              <button
                type="button"
                onClick={() => url && fetchTitleFromUrl(url)}
                disabled={!url || loadingTitle}
                className="h-11 rounded-lg border border-black/10 px-4 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10"
              >
                {loadingTitle ? "抓取中" : "抓取标题"}
              </button>
            </div>
            {titleError ? (
              <div className="text-xs text-foreground/60">
                抓取失败：{titleError}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="type">
              类型
            </label>
            <select
              id="type"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="cred">
              可信度
            </label>
            <select
              id="cred"
              value={credibility}
              onChange={(e) => setCredibility(e.target.value as Credibility)}
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            >
              {CREDIBILITY_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <div className="text-sm font-medium">朝代</div>
            <div className="flex flex-wrap gap-2">
              {DYNASTIES.map((d) => {
                const active = dynasties.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDynasty(d)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-black/10 text-foreground/80 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="people">
              人物（逗号分隔）
            </label>
            <input
              id="people"
              value={peopleInput}
              onChange={(e) => setPeopleInput(e.target.value)}
              placeholder="例如：汉武帝, 桑弘羊"
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="events">
              事件（逗号分隔）
            </label>
            <input
              id="events"
              value={eventsInput}
              onChange={(e) => setEventsInput(e.target.value)}
              placeholder="例如：盐铁会议"
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <div className="text-sm font-medium">相似维度</div>
            <div className="flex flex-wrap gap-2">
              {DIMENSIONS.map((dim) => {
                const active = dimensions.includes(dim);
                return (
                  <button
                    key={dim}
                    type="button"
                    onClick={() => toggleDimension(dim)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-black/10 text-foreground/80 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                    }`}
                  >
                    {dim}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="excerpt">
              引用摘录（可选）
            </label>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="复制你想在视频里引用的关键句子"
              className="min-h-24 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="notes">
              备注（可选）
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="你自己的理解、可用角度、争议点…"
              className="min-h-24 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-foreground/60">
            本地存储版本：后续可接入 Notion 做云端同步与协作。
          </div>
          <button
            type="button"
            onClick={addItem}
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
          >
            入库
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="search">
            搜索
          </label>
          <input
            id="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="标题 / 人物 / 事件 / 维度"
            className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </div>
        <div className="flex flex-col gap-1 sm:w-56">
          <label className="text-sm font-medium" htmlFor="dynasty">
            朝代筛选
          </label>
          <select
            id="dynasty"
            value={filterDynasty}
            onChange={(e) => setFilterDynasty(e.target.value as Dynasty | "全部")}
            className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          >
            <option value="全部">全部</option>
            {DYNASTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-sm text-foreground/70">共 {filtered.length} 条材料</div>

      <div className="grid gap-3">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="rounded-xl border border-black/10 p-4 dark:border-white/10"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{m.title}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                  <span>{m.sourceType}</span>
                  <span>可信度：{m.credibility}</span>
                  {m.dynasties.length ? (
                    <span>朝代：{m.dynasties.join(" / ")}</span>
                  ) : null}
                </div>
                {m.citation?.work ? (
                  <div className="mt-2 text-xs text-foreground/60">
                    出处：{m.citation.work}
                    {m.citation.locator ? ` · ${m.citation.locator}` : ""}
                    {m.citation.canonicalUrl ? (
                      <>
                        {" "}
                        <a
                          href={toReaderHref(m.citation.canonicalUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-foreground"
                        >
                          阅读版
                        </a>
                        {!isSlowHost(m.citation.canonicalUrl) ? (
                          <>
                            {" "}
                            <a
                              href={m.citation.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-foreground"
                            >
                              原站
                            </a>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : m.url ? (
                  <div className="mt-2 text-xs text-foreground/60">
                    <a
                      href={toReaderHref(m.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground"
                    >
                      阅读版
                    </a>
                    {!isSlowHost(m.url) ? (
                      <>
                        {" "}
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-foreground"
                        >
                          原站
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeItem(m.id)}
                className="h-9 self-start rounded-lg border border-black/10 px-3 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                删除
              </button>
            </div>

            {m.people.length || m.events.length || m.dimensions.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.people.map((x) => (
                  <span
                    key={`p:${x}`}
                    className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-foreground/70 dark:border-white/10"
                  >
                    {x}
                  </span>
                ))}
                {m.events.map((x) => (
                  <span
                    key={`e:${x}`}
                    className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-foreground/70 dark:border-white/10"
                  >
                    {x}
                  </span>
                ))}
                {m.dimensions.map((x) => (
                  <span
                    key={`d:${x}`}
                    className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-foreground/70 dark:border-white/10"
                  >
                    {x}
                  </span>
                ))}
              </div>
            ) : null}

            {m.excerpt ? (
              <div className="mt-3 whitespace-pre-wrap rounded-lg bg-black/5 px-3 py-2 text-sm text-foreground/80 dark:bg-white/10">
                {m.excerpt}
              </div>
            ) : null}

            {m.notes ? (
              <div className="mt-2 text-sm text-foreground/70">{m.notes}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

