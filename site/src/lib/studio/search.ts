export type WebSearchResult = {
  title: string;
  url: string;
  content?: string;
};

export type ClassicalCitation = {
  work: string;
  locator?: string;
  canonicalUrl: string;
};

export type ClassicalSearchResult = {
  title: string;
  url: string;
  citation?: ClassicalCitation;
  quote?: string;
  cacheText?: string;
  note?: string;
};

function normalizeSpace(s: string) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function extractReaderTitle(text: string): string {
  return (
    text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ??
    text.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
    ""
  );
}

function isNoiseLine(line: string): boolean {
  if (!line) return true;
  if (/^[=\-]{3,}\s*$/.test(line)) return true;
  if (line.startsWith("[")) return true;
  if (line.startsWith("!")) return true;
  if (line.startsWith("* ")) return true;
  if (line.startsWith("- ")) return true;
  if (line.startsWith("|")) return true;
  if (line.startsWith("URL Source:")) return true;
  if (line.startsWith("Published Time:")) return true;
  if (line.startsWith("Warning:")) return true;
  if (line.includes("中国哲学书电子化计划") || line.includes("中國哲學書電子化計劃"))
    return true;
  if (line.includes("维基文库") || line.includes("維基文庫")) return true;
  return false;
}

function cjkCount(s: string): number {
  const m = s.match(/[\u3400-\u9fff]/g);
  return m ? m.length : 0;
}

function extractQuoteFromReader(text: string, maxChars: number): string {
  const content = extractMarkdownContent(text);
  const lines = content
    .split(/\r?\n/g)
    .map((l) => normalizeSpace(l))
    .filter(Boolean);

  const candidates: string[] = [];
  for (const line of lines) {
    if (isNoiseLine(line)) continue;
    const cjk = cjkCount(line);
    if (cjk < 12) continue;
    candidates.push(line);
    if (candidates.length >= 8) break;
  }
  if (!candidates.length) return "";

  let out = "";
  for (const line of candidates) {
    if (!out) out = line;
    else if (out.length < maxChars) out = `${out} ${line}`;
    if (out.length >= maxChars) break;
  }
  return out.slice(0, maxChars);
}

function parseCitationFromTitleAndUrl(url: string, title: string): ClassicalCitation | undefined {
  try {
    const u = new URL(url);
    const left = normalizeSpace(title.split(" - ")[0] ?? title);
    const bracketWork = left.match(/《([^》]+)》/);
    const extractedWork = bracketWork?.[1]?.trim() ?? "";
    const withoutBracketWork = bracketWork
      ? normalizeSpace(left.replace(bracketWork[0], ""))
      : left;
    if (u.hostname === "ctext.org") {
      const parts = left.split(/\s*[:：]\s*/g).map((x) => x.trim()).filter(Boolean);
      const work = parts[0];
      if (!work) return undefined;
      const locator = parts.slice(1).join("·") || undefined;
      return { work, locator, canonicalUrl: url };
    }
    if (
      u.hostname === "zh.wikisource.org" ||
      u.hostname === "www.shidianguji.com" ||
      u.hostname === "shidianguji.com"
    ) {
      const parts = left.split("/").map((x) => x.trim()).filter(Boolean);
      const work = parts[0];
      if (!work) return undefined;
      const locator = parts.slice(1).join("·") || undefined;
      return { work, locator, canonicalUrl: url };
    }
    if (u.hostname === "kanripo.org") {
      const work = left || normalizeSpace(u.pathname.split("/").filter(Boolean)[0] ?? "");
      if (!work) return undefined;
      const locator = normalizeSpace(u.pathname.split("/").filter(Boolean).slice(-1)[0] ?? "");
      return { work, locator: locator || undefined, canonicalUrl: url };
    }
    if (
      u.hostname === "www.guoxuedashi.com" ||
      u.hostname === "guoxuedashi.com" ||
      u.hostname === "www.guoxuedashi.net" ||
      u.hostname === "guoxuedashi.net" ||
      u.hostname === "m2.guoxuedashi.net" ||
      u.hostname === "www.zhonghuadiancang.com" ||
      u.hostname === "zhonghuadiancang.com" ||
      u.hostname === "www.diancangwang.cn" ||
      u.hostname === "diancangwang.cn" ||
      u.hostname === "www.diancang.xyz" ||
      u.hostname === "diancang.xyz" ||
      u.hostname === "www.sdsf.org.cn" ||
      u.hostname === "sdsf.org.cn"
    ) {
      const work = extractedWork || withoutBracketWork.split(/\s+/g)[0] || "";
      if (!work) return undefined;
      let locator = "";
      if (extractedWork) {
        locator = normalizeSpace(withoutBracketWork);
      } else {
        locator = normalizeSpace(withoutBracketWork.split(/\s+/g).slice(1).join(" "));
      }
      locator = locator.replace(/在线阅读.*/g, "").trim();
      return { work, locator: locator || undefined, canonicalUrl: url };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function fetchReader(url: string): Promise<string> {
  const resp = await fetch(`https://r.jina.ai/${url}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < items.length) {
      const i = index;
      index += 1;
      results[i] = await fn(items[i] as T);
    }
  });
  await Promise.all(workers);
  return results;
}

function extractMarkdownContent(text: string): string {
  const marker = "Markdown Content:";
  const idx = text.indexOf(marker);
  if (idx === -1) return text;
  return text.slice(idx + marker.length).trim();
}

function unwrapDuckDuckGoRedirect(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname !== "duckduckgo.com") return url;
    if (u.pathname !== "/l/") return url;
    const uddg = u.searchParams.get("uddg");
    if (!uddg) return url;
    return decodeURIComponent(uddg);
  } catch {
    return url;
  }
}

function normalizeCtextChineseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname !== "ctext.org") return url;
    if (u.pathname.endsWith("/ens")) {
      u.pathname = u.pathname.replace(/\/ens$/, "/zhs");
      return u.toString();
    }
    if (u.pathname.endsWith("/zh")) {
      u.pathname = u.pathname.replace(/\/zh$/, "/zhs");
      return u.toString();
    }
    if (u.pathname.endsWith("/zhs")) return u.toString();
    u.pathname = u.pathname.replace(/\/$/, "") + "/zhs";
    return u.toString();
  } catch {
    return url;
  }
}

function parseMarkdownLinks(markdown: string): Array<{ title: string; url: string }> {
  const out: Array<{ title: string; url: string }> = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  for (const match of markdown.matchAll(re)) {
    const title = normalizeSpace(match[1] ?? "");
    const url = normalizeSpace(match[2] ?? "");
    if (!title || !url) continue;
    out.push({ title, url });
  }
  return out;
}

function getStringField(payload: unknown, field: string): string {
  if (!payload || typeof payload !== "object") return "";
  const rec = payload as Record<string, unknown>;
  const v = rec[field];
  return typeof v === "string" ? v : "";
}

function getArrayField(payload: unknown, field: string): unknown[] | null {
  if (!payload || typeof payload !== "object") return null;
  const rec = payload as Record<string, unknown>;
  const v = rec[field];
  return Array.isArray(v) ? v : null;
}

function parseJinaSearchJson(payload: unknown): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const data = getArrayField(payload, "data");
  if (data) return data;
  const results = getArrayField(payload, "results");
  if (results) return results;
  const items = getArrayField(payload, "items");
  if (items) return items;
  return [];
}

async function duckDuckGoSearch(query: string): Promise<WebSearchResult[]> {
  const q = normalizeSpace(query);
  if (!q) return [];
  const target = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const resp = await fetch(`https://r.jina.ai/${target}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const text = await resp.text();
  const content = extractMarkdownContent(text);
  const links = parseMarkdownLinks(content);
  const seen = new Set<string>();
  const out: WebSearchResult[] = [];
  for (const l of links) {
    const url = normalizeCtextChineseUrl(unwrapDuckDuckGoRedirect(l.url));
    if (!url.startsWith("http")) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title: l.title, url });
    if (out.length >= 12) break;
  }
  return out;
}

export type ClassicalSite = {
  id: string;
  label: string;
  hosts: string[];
  enabledByDefault: boolean;
};

export const CLASSICAL_SITES: ClassicalSite[] = [
  { id: "ctext", label: "CTEXT", hosts: ["ctext.org"], enabledByDefault: true },
  {
    id: "kanripo",
    label: "Kanripo",
    hosts: ["kanripo.org"],
    enabledByDefault: true,
  },
  {
    id: "guoxuedashi",
    label: "国学大师",
    hosts: [
      "www.guoxuedashi.com",
      "guoxuedashi.com",
      "www.guoxuedashi.net",
      "guoxuedashi.net",
      "m2.guoxuedashi.net",
    ],
    enabledByDefault: true,
  },
  {
    id: "diancang",
    label: "中华典藏",
    hosts: [
      "www.zhonghuadiancang.com",
      "zhonghuadiancang.com",
      "www.diancangwang.cn",
      "diancangwang.cn",
      "www.diancang.xyz",
      "diancang.xyz",
    ],
    enabledByDefault: true,
  },
  {
    id: "shidianguji",
    label: "识典古籍",
    hosts: ["www.shidianguji.com", "shidianguji.com"],
    enabledByDefault: true,
  },
  {
    id: "sdsf",
    label: "三洞四辅",
    hosts: ["www.sdsf.org.cn", "sdsf.org.cn"],
    enabledByDefault: true,
  },
  {
    id: "wikisource",
    label: "维基文库",
    hosts: ["zh.wikisource.org"],
    enabledByDefault: false,
  },
];

function defaultClassicalHosts(): string[] {
  return CLASSICAL_SITES.filter((s) => s.enabledByDefault).flatMap((s) => s.hosts);
}

function normalizeHostInput(host: string): string {
  const h = String(host ?? "").trim();
  if (!h) return "";
  if (h.startsWith("http://") || h.startsWith("https://")) {
    try {
      return new URL(h).hostname;
    } catch {
      return "";
    }
  }
  return h.split("/")[0] ?? "";
}

function buildAllowedHostSet(hosts?: string[]): Set<string> {
  const list = (hosts?.length ? hosts : defaultClassicalHosts())
    .map(normalizeHostInput)
    .filter(Boolean);
  return new Set(list);
}

function isAllowedHost(url: string, allowedHosts: Set<string>): boolean {
  try {
    const u = new URL(url);
    return allowedHosts.has(u.hostname);
  } catch {
    return false;
  }
}

export async function classicalSearch(
  query: string,
  opts?: { hosts?: string[] },
): Promise<WebSearchResult[]> {
  const q = normalizeSpace(query);
  if (!q) return [];
  const allowedHosts = buildAllowedHostSet(opts?.hosts);
  const siteQuery = [...allowedHosts].map((h) => `site:${h}`).join(" OR ");
  const fullQuery = `${q} (${siteQuery})`;
  const results = await duckDuckGoSearch(fullQuery);
  const filtered = results.filter((r) => isAllowedHost(r.url, allowedHosts));
  const prefer = (u: string) => {
    try {
      const host = new URL(u).hostname;
      if (host === "ctext.org") return 0;
      if (host.includes("guoxuedashi")) return 1;
      if (host.includes("diancang")) return 2;
      if (host === "www.shidianguji.com" || host === "shidianguji.com") return 3;
      if (host === "www.sdsf.org.cn" || host === "sdsf.org.cn") return 4;
      if (host === "kanripo.org") return 5;
      if (host === "zh.wikisource.org") return 6;
      return 9;
    } catch {
      return 9;
    }
  };
  filtered.sort((a, b) => prefer(a.url) - prefer(b.url));
  return filtered;
}

export async function classicalSearchWithExcerpts(
  query: string,
  opts?: { limit?: number; hosts?: string[] },
): Promise<ClassicalSearchResult[]> {
  const results = await classicalSearch(query, { hosts: opts?.hosts });
  const sliced = results.slice(0, opts?.limit ?? 6);
  const enriched = await mapWithConcurrency(sliced, 3, async (r) => {
    try {
      const text = await fetchReader(r.url);
      const title = extractReaderTitle(text) || r.title;
      const citation = parseCitationFromTitleAndUrl(r.url, title);
      const quote = extractQuoteFromReader(text, 240);
      const cacheText = extractQuoteFromReader(text, 1200);
      const note = quote ? undefined : "未提取到正文，建议用阅读器打开原文";
      return { title, url: r.url, citation, quote, cacheText, note };
    } catch {
      return {
        title: r.title,
        url: r.url,
        citation: parseCitationFromTitleAndUrl(r.url, r.title),
        quote: undefined,
        cacheText: undefined,
        note: "正文抓取失败，建议用阅读器打开原文",
      };
    }
  });
  return enriched;
}

export async function jinaSearch(query: string): Promise<WebSearchResult[]> {
  const q = normalizeSpace(query);
  if (!q) return [];
  try {
    const url = `https://s.jina.ai/${encodeURIComponent(q)}`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const payload = (await resp.json()) as unknown;
    const arr = parseJinaSearchJson(payload);
    const out = arr
      .map((x) => ({
        title: normalizeSpace(getStringField(x, "title") || getStringField(x, "name")),
        url: normalizeSpace(getStringField(x, "url") || getStringField(x, "link")),
        content: normalizeSpace(
          getStringField(x, "content") || getStringField(x, "description"),
        ),
      }))
      .filter((x) => x.title && x.url);

    const seen = new Set<string>();
    const deduped: WebSearchResult[] = [];
    for (const it of out) {
      const key = it.url;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(it);
    }
    if (deduped.length) return deduped;
  } catch {}
  return duckDuckGoSearch(q);
}
