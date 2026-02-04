import fs from "node:fs/promises";
import path from "node:path";

const SITE_ROOT = process.cwd();
const KEYWORDS_PATH = path.join(SITE_ROOT, "src", "data", "studio-keywords.json");
const OUTPUT_PATH = path.join(SITE_ROOT, "public", "auto-hot.json");

const MAX_ITEMS = 200;
const PLATFORM_LIMITS = {
  weibo: 60,
  douyin: 60,
  bilibili: 30,
  wechat: 25,
  xiaohongshu: 25,
};
const FEED_COUNT = 60;
const FEED_MIN_EACH = 3;
const FEED_WEIGHTS = {
  weibo: 0.4,
  douyin: 0.3,
  wechat: 0.1,
  xiaohongshu: 0.1,
  bilibili: 0.1,
};
const SEARCH_PER_KEYWORD = 3;
const NOTION_SYNC_LIMIT = 30;
const TOPHUB_MAX_PAGES = 6;

function nowIso() {
  return new Date().toISOString();
}

function normalizeSpace(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function makeId(platform, title, url) {
  const base = normalizeSpace(url || title).toLowerCase();
  const hash = simpleHash(`${platform}:${base}`);
  return `auto_${platform}_${hash}`;
}

function simpleHash(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonIfChanged(filePath, data) {
  const next = JSON.stringify(data, null, 2) + "\n";
  const prev = await fs.readFile(filePath, "utf8").catch(() => null);
  if (prev === next) return false;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, next, "utf8");
  return true;
}

async function fetchJson(url, init) {
  const resp = await fetch(url, init);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${url}`);
  return resp.json();
}

function pickKeywords(groups, maxPerGroup = 2) {
  const out = [];
  for (const g of groups || []) {
    const kws = Array.isArray(g.keywords) ? g.keywords : [];
    for (const kw of kws.slice(0, maxPerGroup)) {
      const k = normalizeSpace(kw);
      if (k) out.push(k);
    }
  }
  return [...new Set(out)];
}

function platformLabel(platform) {
  if (platform === "weibo") return "微博";
  if (platform === "bilibili") return "B站";
  if (platform === "wechat") return "微信";
  if (platform === "douyin") return "抖音";
  if (platform === "xiaohongshu") return "小红书";
  return platform;
}

async function collectWeibo() {
  const url = "https://weibo.com/ajax/side/hotSearch";
  const json = await fetchJson(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json, text/plain, */*",
      Referer: "https://weibo.com/",
    },
  });
  const data = json?.data;
  const out = [];
  const collectedAt = nowIso();

  const pushWord = (word, label) => {
    const title = normalizeSpace(word).replace(/^#|#$/g, "");
    if (!title) return;
    const url = `https://s.weibo.com/weibo?q=${encodeURIComponent(`#${title}#`)}`;
    out.push({
      id: makeId("weibo", title, url),
      title,
      url,
      platform: "weibo",
      keywords: label ? [normalizeSpace(label)] : [],
      collectedAt,
      source: "weibo_hotSearch",
    });
  };

  if (data?.hotgov?.word) pushWord(data.hotgov.word, data.hotgov?.label_name);
  const list = Array.isArray(data?.realtime) ? data.realtime : [];
  for (const item of list.slice(0, PLATFORM_LIMITS.weibo)) {
    pushWord(item?.word, item?.label_name);
  }
  return out;
}

async function collectDouyin() {
  const url = "https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/";
  const json = await fetchJson(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.douyin.com/",
    },
  });
  const list = Array.isArray(json?.word_list) ? json.word_list : [];
  const collectedAt = nowIso();
  const out = [];

  for (const it of list.slice(0, PLATFORM_LIMITS.douyin)) {
    const title = normalizeSpace(it?.word);
    if (!title) continue;
    const url = `https://www.douyin.com/search/${encodeURIComponent(title)}`;
    out.push({
      id: makeId("douyin", title, url),
      title,
      url,
      platform: "douyin",
      keywords: [],
      collectedAt,
      source: "douyin_hotsearch",
    });
  }

  return out;
}

async function collectBilibili() {
  const url = "https://app.bilibili.com/x/v2/search/trending/ranking?limit=30";
  const json = await fetchJson(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const list = Array.isArray(json?.data?.list) ? json.data.list : [];
  const collectedAt = nowIso();
  const out = [];

  for (const it of list.slice(0, PLATFORM_LIMITS.bilibili)) {
    const title = normalizeSpace(it?.keyword ?? it?.show_name ?? it?.title);
    if (!title) continue;
    const url = `https://search.bilibili.com/all?keyword=${encodeURIComponent(title)}`;
    out.push({
      id: makeId("bilibili", title, url),
      title,
      url,
      platform: "bilibili",
      keywords: [],
      collectedAt,
      source: "bilibili_trending_ranking",
    });
  }

  return out;
}

function parseJinaSearchJson(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

async function jinaSearch(query) {
  const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
  const payload = await fetchJson(url, { headers: { Accept: "application/json" } });
  const arr = parseJinaSearchJson(payload);
  return arr
    .map((x) => ({
      title: normalizeSpace(x?.title ?? x?.name ?? ""),
      url: normalizeSpace(x?.url ?? x?.link ?? ""),
      content: normalizeSpace(x?.content ?? x?.description ?? ""),
    }))
    .filter((x) => x.title && x.url);
}

async function fetchTophubJson(endpoint, params = {}) {
  const apikey = process.env.TOPHUB_API_KEY?.trim();
  if (!apikey) return null;
  const url = new URL(`https://api.tophubdata.com${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    url.searchParams.set(k, String(v));
  }
  const resp = await fetch(url.toString(), { headers: { Authorization: apikey } });
  if (!resp.ok) return null;
  return resp.json().catch(() => null);
}

async function tophubFindHashid({ name, displayIncludes }) {
  for (let p = 1; p <= TOPHUB_MAX_PAGES; p += 1) {
    const json = await fetchTophubJson("/nodes", { p });
    const data = json?.data;
    if (!Array.isArray(data)) continue;
    for (const n of data) {
      const nName = normalizeSpace(n?.name);
      const nDisplay = normalizeSpace(n?.display);
      const hashid = normalizeSpace(n?.hashid);
      if (!hashid) continue;
      if (nName !== name) continue;
      if (displayIncludes && !nDisplay.includes(displayIncludes)) continue;
      return hashid;
    }
  }
  return null;
}

async function collectTophubNode({ hashid, platform, source }) {
  const json = await fetchTophubJson(`/nodes/${hashid}`);
  const node = json?.data;
  const items = Array.isArray(node?.items) ? node.items : [];
  const collectedAt = nowIso();
  const out = [];
  for (const it of items.slice(0, PLATFORM_LIMITS[platform] ?? 20)) {
    const title = normalizeSpace(it?.title);
    const url = normalizeSpace(it?.url);
    if (!title || !url) continue;
    out.push({
      id: makeId(platform, title, url),
      title,
      url,
      platform,
      keywords: [],
      collectedAt,
      source,
    });
  }
  return out;
}

async function collectBySearch({ platform, siteHost, keywords }) {
  const collectedAt = nowIso();
  const out = [];

  for (const kw of keywords) {
    const q = `${kw} 热点 site:${siteHost}`;
    let results = [];
    try {
      results = await jinaSearch(q);
    } catch {
      continue;
    }
    for (const r of results.slice(0, SEARCH_PER_KEYWORD)) {
      const title = normalizeSpace(r.title);
      const url = normalizeSpace(r.url);
      out.push({
        id: makeId(platform, title, url),
        title,
        url,
        platform,
        keywords: [kw],
        collectedAt,
        source: `jina_search:${siteHost}`,
      });
    }
  }

  return out;
}

async function collectGenericSearch({ platform, siteHost, queries, limit = 12 }) {
  const collectedAt = nowIso();
  const out = [];
  for (const q of queries) {
    let results = [];
    try {
      results = await jinaSearch(`${q} site:${siteHost}`);
    } catch {
      continue;
    }
    for (const r of results.slice(0, Math.min(SEARCH_PER_KEYWORD, 5))) {
      const title = normalizeSpace(r.title);
      const url = normalizeSpace(r.url);
      out.push({
        id: makeId(platform, title, url),
        title,
        url,
        platform,
        keywords: [],
        collectedAt,
        source: `jina_search_generic:${siteHost}`,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function mergeAndTrim(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const urlKey = normalizeSpace(it.url || "");
    const key = urlKey ? `u:${urlKey}` : `t:${it.platform}:${normalizeSpace(it.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  out.sort((a, b) => String(b.collectedAt).localeCompare(String(a.collectedAt)));

  const byPlatform = new Map();
  const limited = [];
  for (const it of out) {
    const count = byPlatform.get(it.platform) ?? 0;
    const limit = PLATFORM_LIMITS[it.platform] ?? 30;
    if (count >= limit) continue;
    byPlatform.set(it.platform, count + 1);
    limited.push(it);
    if (limited.length >= MAX_ITEMS) break;
  }

  return limited;
}

function pickWeightedFeed(items) {
  const byPlatform = new Map();
  for (const it of items) {
    const arr = byPlatform.get(it.platform) ?? [];
    arr.push(it);
    byPlatform.set(it.platform, arr);
  }

  const platforms = Object.keys(FEED_WEIGHTS);
  const feed = [];
  const taken = new Map(platforms.map((p) => [p, 0]));

  for (const p of platforms) {
    const list = byPlatform.get(p) ?? [];
    const canTake = Math.min(FEED_MIN_EACH, list.length);
    for (let i = 0; i < canTake; i += 1) {
      feed.push(list[i]);
    }
    taken.set(p, canTake);
  }

  while (feed.length < FEED_COUNT) {
    let bestPlatform = null;
    let bestGap = -Infinity;
    for (const p of platforms) {
      const list = byPlatform.get(p) ?? [];
      const have = taken.get(p) ?? 0;
      if (have >= list.length) continue;
      const desired = FEED_WEIGHTS[p] * FEED_COUNT;
      const gap = desired - have;
      if (gap > bestGap) {
        bestGap = gap;
        bestPlatform = p;
      }
    }
    if (!bestPlatform) break;
    const idx = taken.get(bestPlatform) ?? 0;
    const list = byPlatform.get(bestPlatform) ?? [];
    feed.push(list[idx]);
    taken.set(bestPlatform, idx + 1);
  }

  const feedSet = new Set(feed.map((x) => x.id));
  const rest = items.filter((x) => !feedSet.has(x.id));
  return [...feed, ...rest];
}

async function syncToNotion(hotItems) {
  const token = process.env.NOTION_TOKEN?.trim();
  const databaseId = process.env.NOTION_HOT_DB_ID?.trim() || null;
  const dataSourceIdEnv = process.env.NOTION_HOT_DATA_SOURCE_ID?.trim() || null;
  if (!token || (!databaseId && !dataSourceIdEnv)) return { enabled: false, created: 0 };

  const { Client } = await import("@notionhq/client");
  const notion = new Client({ auth: token });

  let dataSourceId = dataSourceIdEnv;
  if (!dataSourceId && databaseId) {
    const db = await notion.databases
      .retrieve({ database_id: databaseId })
      .catch(() => null);
    dataSourceId = db?.data_sources?.[0]?.id ?? null;
  }
  if (!dataSourceId && !databaseId) return { enabled: true, created: 0 };

  const recent = [];
  if (dataSourceId) {
    const resp = await notion.dataSources
      .query({
        data_source_id: dataSourceId,
        page_size: 50,
        result_type: "page",
        sorts: [{ property: "CreatedAt", direction: "descending" }],
      })
      .catch(() => null);
    if (resp?.results) recent.push(...resp.results);
  }

  const existed = new Set();
  for (const p of recent) {
    const props = p?.properties ?? {};
    const title = normalizeSpace(
      props?.Title?.title?.map((x) => x?.plain_text).join("") ?? "",
    );
    const url = normalizeSpace(props?.URL?.url ?? "");
    if (url) existed.add(`u:${url}`);
    if (title) existed.add(`t:${title.toLowerCase()}`);
  }

  let created = 0;
  for (const it of hotItems.slice(0, NOTION_SYNC_LIMIT)) {
    const urlKey = it.url ? `u:${it.url}` : null;
    const titleKey = `t:${it.title.toLowerCase()}`;
    if ((urlKey && existed.has(urlKey)) || existed.has(titleKey)) continue;

    const parent = databaseId
      ? { database_id: databaseId }
      : { data_source_id: dataSourceId };

    const properties = {
      Title: {
        type: "title",
        title: [{ type: "text", text: { content: it.title } }],
      },
      URL: { type: "url", url: it.url },
      Platform: { type: "select", select: { name: platformLabel(it.platform) } },
      Keywords: it.keywords?.length
        ? { type: "multi_select", multi_select: it.keywords.map((k) => ({ name: k })) }
        : undefined,
      CreatedAt: { type: "date", date: { start: it.collectedAt } },
    };

    await notion.pages
      .create({
        parent,
        properties: Object.fromEntries(
          Object.entries(properties).filter(([, v]) => v !== undefined),
        ),
      })
      .catch(() => null);

    created += 1;
    if (urlKey) existed.add(urlKey);
    existed.add(titleKey);
  }

  return { enabled: true, created };
}

async function main() {
  const keywordsCfg = await readJson(KEYWORDS_PATH, { groups: [] });
  const keywords = pickKeywords(keywordsCfg?.groups, 2);

  const all = [];
  try {
    all.push(...(await collectWeibo()));
  } catch (e) {
    console.warn("weibo collect failed:", e?.message ?? e);
  }

  try {
    all.push(...(await collectDouyin()));
  } catch (e) {
    console.warn("douyin collect failed:", e?.message ?? e);
  }

  try {
    all.push(...(await collectBilibili()));
  } catch (e) {
    console.warn("bilibili collect failed:", e?.message ?? e);
  }

  const wechatKeywords = keywords.slice(0, 12);
  const xhsKeywords = keywords.slice(0, 12);

  try {
    all.push(
      ...(await collectBySearch({
        platform: "wechat",
        siteHost: "mp.weixin.qq.com",
        keywords: wechatKeywords,
      })),
    );
    all.push(
      ...(await collectGenericSearch({
        platform: "wechat",
        siteHost: "mp.weixin.qq.com",
        queries: ["热点", "热搜", "热榜", "今日 热点", "事件 热点"],
        limit: 12,
      })),
    );
  } catch (e) {
    console.warn("wechat search failed:", e?.message ?? e);
  }

  try {
    all.push(
      ...(await collectBySearch({
        platform: "xiaohongshu",
        siteHost: "xiaohongshu.com",
        keywords: xhsKeywords,
      })),
    );
    all.push(
      ...(await collectGenericSearch({
        platform: "xiaohongshu",
        siteHost: "xiaohongshu.com",
        queries: ["热点", "热搜", "热榜", "今日 热点", "事件 热点"],
        limit: 12,
      })),
    );
  } catch (e) {
    console.warn("xiaohongshu search failed:", e?.message ?? e);
  }

  const haveWechat = all.some((x) => x.platform === "wechat");
  const haveXhs = all.some((x) => x.platform === "xiaohongshu");

  if (!haveWechat) {
    try {
      const hashid =
        process.env.TOPHUB_WECHAT_HASHID?.trim() ||
        (await tophubFindHashid({ name: "微信", displayIncludes: "热文" })) ||
        "WnBe01o371";
      all.push(
        ...(await collectTophubNode({
          hashid,
          platform: "wechat",
          source: "tophub_wechat",
        })),
      );
    } catch (e) {
      console.warn("wechat tophub fallback failed:", e?.message ?? e);
    }
  }

  if (!haveXhs) {
    try {
      const hashid =
        process.env.TOPHUB_XHS_HASHID?.trim() ||
        (await tophubFindHashid({ name: "小红书", displayIncludes: "热榜" }));
      if (hashid) {
        all.push(
          ...(await collectTophubNode({
            hashid,
            platform: "xiaohongshu",
            source: "tophub_xiaohongshu",
          })),
        );
      }
    } catch (e) {
      console.warn("xiaohongshu tophub fallback failed:", e?.message ?? e);
    }
  }

  const merged = mergeAndTrim(all);
  const mixed = pickWeightedFeed(merged);
  const payload = { version: 1, generatedAt: nowIso(), items: mixed };
  const changed = await writeJsonIfChanged(OUTPUT_PATH, payload);

  const notion = await syncToNotion(mixed);
  console.log(
    JSON.stringify(
      {
        generatedAt: payload.generatedAt,
        count: mixed.length,
        wroteFile: changed,
        notion,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
