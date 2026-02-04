"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function normalizeSpace(s: string) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function extractMarkdownContent(text: string): string {
  const marker = "Markdown Content:";
  const idx = text.indexOf(marker);
  if (idx === -1) return text;
  return text.slice(idx + marker.length).trim();
}

function extractReaderTitle(text: string): string {
  return (
    text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ??
    text.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
    ""
  );
}

function cjkCount(s: string): number {
  const m = s.match(/[\u3400-\u9fff]/g);
  return m ? m.length : 0;
}

function looksLikeMenuLine(line: string): boolean {
  const l = normalizeSpace(line);
  if (!l) return true;
  if (l.startsWith("URL Source:")) return true;
  if (l.startsWith("Published Time:")) return true;
  if (l.startsWith("Warning:")) return true;
  if (l.startsWith("[") || l.startsWith("![")) return true;
  if (l.startsWith("* ") || l.startsWith("- ")) return true;
  if (l.startsWith("|")) return true;
  if (/^[=\-]{3,}\s*$/.test(l)) return true;
  const keywords = [
    "主菜单",
    "主選單",
    "导航",
    "導航",
    "帮助",
    "幫助",
    "编辑",
    "編輯",
    "搜索",
    "搜尋",
    "最近更改",
    "特殊页面",
    "所有页面",
    "版权",
    "版權",
    "维基文库",
    "維基文庫",
  ];
  if (keywords.some((k) => l.includes(k))) return true;
  return false;
}

function cleanBody(markdownContent: string): string {
  const lines = markdownContent
    .split(/\r?\n/g)
    .map((x) => x.replace(/\u00a0/g, " "))
    .map((x) => x.trimEnd());

  const kept: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (kept.length && kept[kept.length - 1] !== "") kept.push("");
      continue;
    }
    if (looksLikeMenuLine(line)) continue;
    if (cjkCount(line) < 4 && !/^#+\s/.test(line)) continue;
    kept.push(raw);
  }

  const compacted: string[] = [];
  for (const l of kept) {
    if (!l && compacted[compacted.length - 1] === "") continue;
    compacted.push(l);
  }

  const body = compacted.join("\n").trim();
  return body;
}

function normalizeUrl(input: string): string {
  const raw0 = String(input ?? "").trim();
  const raw = raw0.includes("%") ? (() => {
    try {
      return decodeURIComponent(raw0);
    } catch {
      return raw0;
    }
  })() : raw0;
  if (!raw) return "";
  if (raw.startsWith("https://r.jina.ai/")) {
    return raw.slice("https://r.jina.ai/".length);
  }
  return raw;
}

function toReaderFetchUrl(url: string): string {
  return `https://r.jina.ai/${url}`;
}

function toSourceUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

function isSlowHost(url: string): boolean {
  try {
    const u = new URL(toSourceUrl(url));
    return u.hostname === "zh.wikisource.org";
  } catch {
    return false;
  }
}

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined") return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

const STORAGE_LAST_READER_URL = "studio_reader_last_url_v1";

export function ReaderClient({ url }: { url: string }) {
  const router = useRouter();
  const target = useMemo(() => normalizeUrl(url), [url]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [lastUrl, setLastUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_LAST_READER_URL);
      if (saved) setLastUrl(saved);
      if (!target && saved) setInputUrl(saved);
    } catch {}
  }, [target]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!target) {
        setRawText("");
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(toReaderFetchUrl(target));
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        if (!active) return;
        setRawText(text);
        try {
          window.localStorage.setItem(STORAGE_LAST_READER_URL, toSourceUrl(target));
          setLastUrl(toSourceUrl(target));
        } catch {}
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "加载失败");
        setRawText("");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [target]);

  const title = useMemo(() => (rawText ? extractReaderTitle(rawText) : ""), [rawText]);
  const body = useMemo(() => (rawText ? cleanBody(extractMarkdownContent(rawText)) : ""), [rawText]);

  const citationText = useMemo(() => {
    const t = normalizeSpace(title);
    const u = toSourceUrl(target);
    if (!t) return u;
    return `${t}\n${u}`;
  }, [title, target]);

  function openUrl(raw: string) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return;
    const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const href = `/studio/reader?url=${encodeURIComponent(normalized)}`;
    try {
      router.push(href);
    } catch {}
    try {
      window.location.assign(href);
    } catch {}
  }

  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {title || (target ? "未命名条目" : "请输入原文链接")}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/60">
            {target ? (
              <a
                href={toReaderFetchUrl(target)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-foreground"
              >
                阅读版链接
              </a>
            ) : null}
            {target && !isSlowHost(target) ? (
              <a
                href={toSourceUrl(target)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-foreground"
              >
                原站
              </a>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => copyToClipboard(citationText).catch(() => {})}
            className="h-9 shrink-0 self-start rounded-lg border border-black/10 px-3 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            复制引用
          </button>
        </div>
      </div>

      {!target ? (
        <div className="mt-4 grid gap-2">
          <div className="text-sm text-foreground/70">
            你打开的是阅读器首页，没有带 url 参数。把原文链接粘贴到下面即可。
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="例如：https://ctext.org/shang-shu/yu-gong/zhs"
              className="h-11 flex-1 rounded-lg border border-black/10 bg-transparent px-3 text-sm outline-none focus:border-black/30 dark:border-white/10 dark:focus:border-white/30"
            />
            <button
              type="button"
              onClick={() => openUrl(inputUrl)}
              disabled={!inputUrl.trim()}
              className="h-11 rounded-lg bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              打开
            </button>
            {lastUrl ? (
              <button
                type="button"
                onClick={() => openUrl(lastUrl)}
                className="h-11 rounded-lg border border-black/10 px-4 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                打开上次
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {target && loading ? (
        <div className="mt-4 text-sm text-foreground/70">加载中…</div>
      ) : target && error ? (
        <div className="mt-4 text-sm text-foreground/70">加载失败：{error}</div>
      ) : target && body ? (
        <div className="mt-4 whitespace-pre-wrap rounded-lg bg-black/5 px-3 py-2 text-sm text-foreground/80 dark:bg-white/10">
          {body}
        </div>
      ) : target ? (
        <div className="mt-4 text-sm text-foreground/70">
          没有提取到正文。可能该站点内容由脚本渲染或被限制访问。
        </div>
      ) : null}
    </div>
  );
}
