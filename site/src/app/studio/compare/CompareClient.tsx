"use client";

import { useMemo, useState } from "react";
import type { CompareCard, Dynasty, Material } from "@/lib/studio/types";
import { DYNASTIES } from "@/lib/studio/types";
import { matchCompareCards, matchMaterials } from "@/lib/studio/match";
import { nowIso, randomId } from "@/lib/studio/utils";

const STORAGE_KEY = "studio_compare_cards_v1";
const STORAGE_MATERIALS_KEY = "studio_materials_v1";
const STORAGE_COMPARE_DRAFT_KEY = "studio_compare_draft_v1";

function loadFromStorage(): CompareCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as CompareCard[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CompareCard[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadMaterialsFromStorage(): Material[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_MATERIALS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as Material[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

type CompareDraft = {
  topicTitle: string;
  sources: Array<{ title: string; url?: string }>;
};

function loadCompareDraft(): CompareDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_COMPARE_DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CompareDraft;
    if (!data || typeof data !== "object") return null;
    const topicTitle = typeof data.topicTitle === "string" ? data.topicTitle : "";
    const sources = Array.isArray(data.sources) ? data.sources : [];
    return { topicTitle, sources };
  } catch {
    return null;
  }
}

function clearCompareDraft() {
  window.localStorage.removeItem(STORAGE_COMPARE_DRAFT_KEY);
}

function splitLines(input: string): string[] {
  return input
    .split(/\n+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CompareClient() {
  const draft = typeof window === "undefined" ? null : loadCompareDraft();
  const [cards, setCards] = useState<CompareCard[]>(() => loadFromStorage());
  const [materials] = useState<Material[]>(() => loadMaterialsFromStorage());
  const [topicTitle, setTopicTitle] = useState(draft?.topicTitle ?? "");
  const [eventTitle, setEventTitle] = useState("");
  const [dynasties, setDynasties] = useState<Dynasty[]>([]);
  const [timeline, setTimeline] = useState("");
  const [coreConflict, setCoreConflict] = useState("");
  const [keyPeopleInput, setKeyPeopleInput] = useState("");
  const [outcome, setOutcome] = useState("");
  const [controversies, setControversies] = useState("");
  const [sourcesInput, setSourcesInput] = useState(() =>
    draft?.sources?.length
      ? draft.sources.map((s) => `${s.title}${s.url ? ` | ${s.url}` : ""}`).join("\n")
      : "",
  );

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return cards;
    return cards.filter((c) => {
      const hay = [
        c.topicTitle,
        c.eventTitle,
        c.dynasties.join(" "),
        c.timeline ?? "",
        c.coreConflict ?? "",
        c.keyPeople.join(" "),
        c.outcome ?? "",
        c.controversies ?? "",
        c.sources.map((s) => `${s.title} ${s.url ?? ""}`).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [cards, q]);

  const recommendedCards = useMemo(() => {
    const q = topicTitle.trim();
    if (!q) return [];
    return matchCompareCards(q, cards, { limit: 5 });
  }, [cards, topicTitle]);

  const recommendedMaterials = useMemo(() => {
    const q = topicTitle.trim();
    if (!q) return [];
    return matchMaterials(q, materials, { limit: 8 });
  }, [materials, topicTitle]);

  function toggleDynasty(d: Dynasty) {
    setDynasties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function addCard() {
    const t = topicTitle.trim();
    const e = eventTitle.trim();
    if (!t || !e) return;

    const sources = splitLines(sourcesInput).map((line) => {
      const [titlePart, urlPart] = line.split(/\s+\|\s+/);
      return { title: (titlePart ?? line).trim(), url: urlPart?.trim() };
    });

    const newCard: CompareCard = {
      id: randomId("cmp"),
      topicTitle: t,
      eventTitle: e,
      dynasties,
      timeline: timeline.trim() || undefined,
      coreConflict: coreConflict.trim() || undefined,
      keyPeople: keyPeopleInput
        .split(/[,\n，]+/g)
        .map((s) => s.trim())
        .filter(Boolean),
      outcome: outcome.trim() || undefined,
      controversies: controversies.trim() || undefined,
      sources,
      createdAt: nowIso(),
    };

    const next = [newCard, ...cards];
    setCards(next);
    saveToStorage(next);
    clearCompareDraft();
    setTopicTitle("");
    setEventTitle("");
    setDynasties([]);
    setTimeline("");
    setCoreConflict("");
    setKeyPeopleInput("");
    setOutcome("");
    setControversies("");
    setSourcesInput("");
  }

  function applyCardTemplate(c: CompareCard) {
    if (!topicTitle.trim()) setTopicTitle(c.topicTitle);
    setEventTitle(c.eventTitle);
    setDynasties(c.dynasties);
    setTimeline(c.timeline ?? "");
    setCoreConflict(c.coreConflict ?? "");
    setKeyPeopleInput(c.keyPeople.join(", "));
    setOutcome(c.outcome ?? "");
    setControversies(c.controversies ?? "");
    const existing = new Set(splitLines(sourcesInput));
    const lines = c.sources.map((s) => `${s.title}${s.url ? ` | ${s.url}` : ""}`);
    const merged = [...splitLines(sourcesInput), ...lines.filter((l) => !existing.has(l))];
    setSourcesInput(merged.join("\n"));
  }

  function appendSource(title: string, url?: string) {
    const line = `${title}${url ? ` | ${url}` : ""}`.trim();
    if (!line) return;
    const existing = new Set(splitLines(sourcesInput));
    if (existing.has(line)) return;
    const next = [...splitLines(sourcesInput), line].join("\n");
    setSourcesInput(next);
  }

  function removeCard(id: string) {
    const next = cards.filter((x) => x.id !== id);
    setCards(next);
    saveToStorage(next);
  }

  return (
    <div className="flex flex-col gap-6">
      {topicTitle.trim() ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:p-5">
            <div className="text-sm font-semibold">推荐对照卡（已有）</div>
            <div className="mt-0.5 text-xs text-foreground/60">
              用热点标题自动匹配你已做过的对照卡，便于复用。
            </div>
            <div className="mt-3 grid gap-2">
              {recommendedCards.length ? (
                recommendedCards.map((x) => (
                  <div
                    key={x.card.id}
                    className="rounded-xl border border-border bg-surface-2 p-3 text-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{x.card.eventTitle}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                          <span>相关度：{x.score}</span>
                          {x.card.dynasties.length ? (
                            <span>{x.card.dynasties.join(" / ")}</span>
                          ) : null}
                        </div>
                        {(x.reason.tokens.length || x.reason.dimensions.length) ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {x.reason.tokens.slice(0, 6).map((t) => (
                              <span
                                key={`${x.card.id}:${t}`}
                                className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-foreground/70"
                              >
                                {t}
                              </span>
                            ))}
                            {x.reason.dimensions.map((d) => (
                              <span
                                key={`${x.card.id}:${d}`}
                                className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-foreground/70"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => applyCardTemplate(x.card)}
                        className="h-9 shrink-0 self-start rounded-lg bg-accent px-3 text-xs font-medium text-accent-foreground hover:bg-accent/90"
                      >
                        套用
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-foreground/60">暂无推荐。</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:p-5">
            <div className="text-sm font-semibold">推荐材料（sources）</div>
            <div className="mt-0.5 text-xs text-foreground/60">
              从材料库自动匹配资料，一键追加到来源列表。
            </div>
            <div className="mt-3 grid gap-2">
              {recommendedMaterials.length ? (
                recommendedMaterials.map((x) => (
                  <div
                    key={x.material.id}
                    className="rounded-xl border border-border bg-surface-2 p-3 text-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{x.material.title}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                          <span>
                            {x.material.sourceType} / {x.material.credibility}
                          </span>
                          <span>相关度：{x.score}</span>
                          {x.material.url ? (
                            <a
                              href={x.material.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate hover:text-foreground"
                            >
                              打开
                            </a>
                          ) : null}
                        </div>
                        {(x.reason.tokens.length ||
                          x.reason.dimensions.length ||
                          x.reason.dynasties.length) ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {x.reason.tokens.slice(0, 6).map((t) => (
                              <span
                                key={`${x.material.id}:${t}`}
                                className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-foreground/70 dark:border-white/10"
                              >
                                {t}
                              </span>
                            ))}
                            {x.reason.dimensions.map((d) => (
                              <span
                                key={`${x.material.id}:${d}`}
                                className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-foreground/70 dark:border-white/10"
                              >
                                {d}
                              </span>
                            ))}
                            {x.reason.dynasties.map((d) => (
                              <span
                                key={`${x.material.id}:${d}`}
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
                        onClick={() => appendSource(x.material.title, x.material.url)}
                        className="h-9 shrink-0 self-start rounded-lg border border-black/10 px-3 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                      >
                        追加到来源
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-foreground/60">
                  暂无推荐。先去材料库入库一些资料会更准。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="topic">
              热点标题
            </label>
            <input
              id="topic"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="例如：某地限购政策再起争议"
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="event">
              历史事件/制度
            </label>
            <input
              id="event"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="例如：王安石变法·青苗法"
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
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

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="timeline">
              时间线（可选，换行分点）
            </label>
            <textarea
              id="timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="例如：\n- 1069：新法推行\n- 1074：争议扩大…"
              className="min-h-24 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="conflict">
              核心矛盾（可选）
            </label>
            <input
              id="conflict"
              value={coreConflict}
              onChange={(e) => setCoreConflict(e.target.value)}
              placeholder="例如：财政压力下的国家干预 vs 市场与地方弹性"
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="people">
              关键人物（可选，逗号分隔）
            </label>
            <input
              id="people"
              value={keyPeopleInput}
              onChange={(e) => setKeyPeopleInput(e.target.value)}
              placeholder="例如：王安石, 司马光"
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="outcome">
              结果（可选）
            </label>
            <input
              id="outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="例如：改革推进但争议不断，最终多项新法废止/调整"
              className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="controversies">
              争议点（可选）
            </label>
            <textarea
              id="controversies"
              value={controversies}
              onChange={(e) => setControversies(e.target.value)}
              placeholder="例如：史学界对政策效果与社会成本的不同解释"
              className="min-h-20 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="sources">
              来源（可选，换行；格式：标题 | 链接）
            </label>
            <textarea
              id="sources"
              value={sourcesInput}
              onChange={(e) => setSourcesInput(e.target.value)}
              placeholder="例如：\n《宋史·王安石传》 | https://...\n某研究论文 | https://..."
              className="min-h-24 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-foreground/60">
            对照卡会被脚本工厂引用：先结构化，再输出内容。
          </div>
          <button
            type="button"
            onClick={addCard}
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90"
          >
            保存对照卡
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
            placeholder="热点 / 历史事件 / 人物"
            className="h-11 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
          />
        </div>
      </div>

      <div className="text-sm text-foreground/70">共 {filtered.length} 张对照卡</div>

      <div className="grid gap-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-black/10 p-4 dark:border-white/10"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold">
                  {c.topicTitle} → {c.eventTitle}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                  {c.dynasties.length ? (
                    <span>朝代：{c.dynasties.join(" / ")}</span>
                  ) : null}
                  {c.keyPeople.length ? (
                    <span>人物：{c.keyPeople.join(" / ")}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeCard(c.id)}
                className="h-9 self-start rounded-lg border border-black/10 px-3 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                删除
              </button>
            </div>

            {c.coreConflict ? (
              <div className="mt-2 text-sm text-foreground/70">
                核心矛盾：{c.coreConflict}
              </div>
            ) : null}

            {c.timeline ? (
              <div className="mt-3 whitespace-pre-wrap rounded-lg bg-black/5 px-3 py-2 text-sm text-foreground/80 dark:bg-white/10">
                {c.timeline}
              </div>
            ) : null}

            {c.controversies ? (
              <div className="mt-2 text-sm text-foreground/70">
                争议：{c.controversies}
              </div>
            ) : null}

            {c.sources.length ? (
              <div className="mt-3 grid gap-1 text-sm">
                {c.sources.map((s) => (
                  <div key={`${c.id}:${s.title}`} className="text-foreground/70">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground"
                      >
                        {s.title}
                      </a>
                    ) : (
                      <span>{s.title}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

