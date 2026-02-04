import type {
  CompareCard,
  Dynasty,
  HotTopic,
  Material,
  SimilarityDimension,
} from "@/lib/studio/types";
import { DIMENSIONS, DYNASTIES } from "@/lib/studio/types";

export type MatchReason = {
  tokens: string[];
  dimensions: SimilarityDimension[];
  dynasties: Dynasty[];
};

export type MaterialMatch = {
  material: Material;
  score: number;
  reason: MatchReason;
};

export type CompareMatch = {
  card: CompareCard;
  score: number;
  reason: MatchReason;
};

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function tokenWeight(t: string): number {
  const len = t.length;
  if (len >= 6) return 2.2;
  if (len >= 4) return 1.8;
  if (len >= 2) return 1.2;
  return 0.8;
}

function includesAny(hay: string, tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    if (t && hay.includes(t)) out.push(t);
  }
  return out;
}

function detectDynasties(text: string): Dynasty[] {
  const out: Dynasty[] = [];
  for (const d of DYNASTIES) {
    if (text.includes(d.toLowerCase())) out.push(d);
  }
  return out;
}

function detectDimensions(text: string): SimilarityDimension[] {
  const out: SimilarityDimension[] = [];
  for (const dim of DIMENSIONS) {
    if (text.includes(dim.toLowerCase())) out.push(dim);
  }

  const hints: Array<[SimilarityDimension, string[]]> = [
    ["财政", ["税", "财政", "预算", "债", "债务", "货币", "银", "金", "通胀", "物价"]],
    ["权力", ["权力", "官员", "官场", "领导", "权斗", "反腐", "巡视"]],
    ["制度", ["制度", "改革", "政策", "立法", "条例", "监管", "规则", "机制"]],
    ["舆论", ["舆论", "热搜", "媒体", "网民", "流量", "公关", "辟谣"]],
    ["民生", ["民生", "就业", "工资", "社保", "教育", "医疗", "房价", "租房", "消费"]],
    ["战争", ["战争", "军", "兵", "冲突", "战场", "导弹", "武器", "入侵"]],
    ["外交", ["外交", "谈判", "条约", "制裁", "签证", "峰会", "使馆", "大使"]],
    ["技术", ["技术", "ai", "芯片", "算法", "开源", "网络安全", "数据", "隐私"]],
  ];

  for (const [dim, words] of hints) {
    if (words.some((w) => text.includes(w))) out.push(dim);
  }

  return uniq(out);
}

function extractTokensFromHot(hot: HotTopic | string): {
  tokens: string[];
  dimensions: SimilarityDimension[];
  dynasties: Dynasty[];
} {
  const rawText =
    typeof hot === "string"
      ? hot
      : [hot.title, hot.summary ?? "", hot.keywords.join(" ")].join(" ");
  const text = normalizeText(rawText);

  const rawTokens =
    typeof hot === "string"
      ? splitTokens(hot)
      : [hot.title, hot.summary ?? "", ...hot.keywords].flatMap(splitTokens);
  const tokens = uniq(
    rawTokens
      .map((t) => normalizeText(t))
      .filter((t) => t.length >= 2)
      .slice(0, 50),
  );

  const dimensions = detectDimensions(text);
  const dynasties = detectDynasties(text);
  return { tokens, dimensions, dynasties };
}

function splitTokens(s: string): string[] {
  const trimmed = String(s ?? "").trim();
  if (!trimmed) return [];
  const pieces = trimmed.split(/[,\n，。！？、\s|/\\]+/g).filter(Boolean);
  const out: string[] = [];
  for (const p of pieces) {
    if (!p) continue;
    out.push(p);
    if (p.length >= 4) {
      out.push(p.slice(0, 4));
    }
    if (p.length >= 6) {
      out.push(p.slice(0, 6));
    }
  }
  return out;
}

function buildMaterialText(m: Material) {
  const citationText = normalizeText(
    m.citation
      ? [m.citation.work, m.citation.locator ?? "", m.citation.canonicalUrl ?? ""].join(" ")
      : "",
  );
  return {
    title: normalizeText(m.title),
    excerpt: normalizeText(m.excerpt ?? ""),
    notes: normalizeText(m.notes ?? ""),
    people: normalizeText(m.people.join(" ")),
    events: normalizeText(m.events.join(" ")),
    tags: normalizeText(
      [m.sourceType, m.credibility, ...m.dynasties, ...m.dimensions, citationText].join(
        " ",
      ),
    ),
    url: normalizeText(m.url ?? ""),
  };
}

export function matchMaterials(
  input: HotTopic | string,
  materials: Material[],
  opts?: { limit?: number },
): MaterialMatch[] {
  const { tokens, dimensions, dynasties } = extractTokensFromHot(input);

  const out: MaterialMatch[] = [];
  for (const m of materials) {
    const t = buildMaterialText(m);

    const hitsTitle = includesAny(t.title, tokens);
    const hitsExcerpt = includesAny(t.excerpt, tokens);
    const hitsNotes = includesAny(t.notes, tokens);
    const hitsPeople = includesAny(t.people, tokens);
    const hitsEvents = includesAny(t.events, tokens);

    let score = 0;
    for (const hit of hitsTitle) score += 8 * tokenWeight(hit);
    for (const hit of hitsPeople) score += 6 * tokenWeight(hit);
    for (const hit of hitsEvents) score += 6 * tokenWeight(hit);
    for (const hit of hitsExcerpt) score += 4 * tokenWeight(hit);
    for (const hit of hitsNotes) score += 3 * tokenWeight(hit);
    if (t.url && includesAny(t.url, tokens).length) score += 1;

    const dimHits = dimensions.filter((d) => m.dimensions.includes(d));
    score += clamp(dimHits.length, 0, 3) * 6;

    const dynHits = dynasties.filter((d) => m.dynasties.includes(d));
    score += clamp(dynHits.length, 0, 2) * 4;

    if (m.credibility === "高") score += 1;
    if (m.credibility === "低") score -= 1;

    score = Math.round(score * 10) / 10;
    if (score <= 0) continue;

    const reason: MatchReason = {
      tokens: uniq([
        ...hitsTitle,
        ...hitsPeople,
        ...hitsEvents,
        ...hitsExcerpt,
        ...hitsNotes,
      ]).slice(0, 10),
      dimensions: dimHits,
      dynasties: dynHits,
    };

    out.push({ material: m, score, reason });
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, opts?.limit ?? 10);
}

function buildCompareText(c: CompareCard) {
  return normalizeText(
    [
      c.topicTitle,
      c.eventTitle,
      c.dynasties.join(" "),
      c.timeline ?? "",
      c.coreConflict ?? "",
      c.keyPeople.join(" "),
      c.outcome ?? "",
      c.controversies ?? "",
      c.sources.map((s) => `${s.title} ${s.url ?? ""}`).join(" "),
    ].join(" "),
  );
}

export function matchCompareCards(
  input: HotTopic | string,
  cards: CompareCard[],
  opts?: { limit?: number },
): CompareMatch[] {
  const { tokens, dimensions, dynasties } = extractTokensFromHot(input);
  const out: CompareMatch[] = [];
  for (const c of cards) {
    const hay = buildCompareText(c);
    const hitTokens = includesAny(hay, tokens);
    let score = 0;
    for (const hit of hitTokens) score += 5 * tokenWeight(hit);
    const dynHits = dynasties.filter((d) => c.dynasties.includes(d));
    score += clamp(dynHits.length, 0, 2) * 3;

    const dimHits = detectDimensions(hay).filter((d) => dimensions.includes(d));
    score += clamp(dimHits.length, 0, 3) * 2;

    score = Math.round(score * 10) / 10;
    if (score <= 0) continue;
    out.push({
      card: c,
      score,
      reason: { tokens: uniq(hitTokens).slice(0, 10), dimensions: dimHits, dynasties: dynHits },
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, opts?.limit ?? 5);
}
