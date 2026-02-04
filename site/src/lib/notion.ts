import { Client } from "@notionhq/client";
import type { HotTopic, Material } from "@/lib/studio/types";
import {
  CREDIBILITY_LEVELS,
  DYNASTIES,
  DIMENSIONS,
  PLATFORMS,
  SOURCE_TYPES,
} from "@/lib/studio/types";

function getToken(): string | null {
  return process.env.NOTION_TOKEN?.trim() || null;
}

export function isNotionConfigured(): boolean {
  return Boolean(getToken());
}

function getClient(): Client | null {
  const token = getToken();
  if (!token) return null;
  return new Client({ auth: token });
}

function getTextFromProperty(prop: unknown): string {
  const p = prop as { type?: string; rich_text?: Array<{ plain_text: string }> };
  if (p?.type !== "rich_text" || !Array.isArray(p.rich_text)) return "";
  return p.rich_text.map((x) => x.plain_text).join("");
}

function getTitleFromProperty(prop: unknown): string {
  const p = prop as { type?: string; title?: Array<{ plain_text: string }> };
  if (p?.type !== "title" || !Array.isArray(p.title)) return "";
  return p.title.map((x) => x.plain_text).join("");
}

function getUrlFromProperty(prop: unknown): string | undefined {
  const p = prop as { type?: string; url?: string | null };
  if (p?.type !== "url") return undefined;
  const v = p.url?.trim();
  return v ? v : undefined;
}

function getSelectFromProperty(prop: unknown): string | undefined {
  const p = prop as { type?: string; select?: { name?: string | null } | null };
  if (p?.type !== "select") return undefined;
  const v = p.select?.name?.trim();
  return v ? v : undefined;
}

function getMultiSelectFromProperty(prop: unknown): string[] {
  const p = prop as {
    type?: string;
    multi_select?: Array<{ name?: string | null }>;
  };
  if (p?.type !== "multi_select" || !Array.isArray(p.multi_select)) return [];
  return p.multi_select
    .map((x) => x.name?.trim())
    .filter((x): x is string => Boolean(x));
}

function getDateFromProperty(prop: unknown): string | undefined {
  const p = prop as {
    type?: string;
    date?: { start?: string | null } | null;
  };
  if (p?.type !== "date") return undefined;
  const v = p.date?.start?.trim();
  return v ? v : undefined;
}

function env(name: string): string | null {
  const v = process.env[name]?.trim();
  return v ? v : null;
}

function hotDbId(): string | null {
  return env("NOTION_HOT_DB_ID");
}

function hotDataSourceId(): string | null {
  return env("NOTION_HOT_DATA_SOURCE_ID");
}

function materialDbId(): string | null {
  return env("NOTION_MATERIAL_DB_ID");
}

function materialDataSourceId(): string | null {
  return env("NOTION_MATERIAL_DATA_SOURCE_ID");
}

const databaseToDataSource = new Map<string, string | null>();

async function resolveDataSourceId(
  notion: Client,
  databaseId: string,
): Promise<string | null> {
  if (databaseToDataSource.has(databaseId)) {
    return databaseToDataSource.get(databaseId) ?? null;
  }
  const db = await notion.databases
    .retrieve({ database_id: databaseId })
    .catch(() => null);
  const dataSourceId =
    (db as unknown as { data_sources?: Array<{ id?: string }> | undefined })
      ?.data_sources?.[0]?.id ?? null;
  databaseToDataSource.set(databaseId, dataSourceId);
  return dataSourceId;
}

export async function listNotionHotTopics(limit = 50): Promise<HotTopic[]> {
  const notion = getClient();
  const ds = hotDataSourceId();
  const db = hotDbId();
  if (!notion || (!ds && !db)) return [];

  const dataSourceId = ds ?? (db ? await resolveDataSourceId(notion, db) : null);
  if (!dataSourceId) return [];

  const resp = await notion.dataSources
    .query({
      data_source_id: dataSourceId,
      page_size: Math.min(Math.max(limit, 1), 100),
      result_type: "page",
      sorts: [{ property: "CreatedAt", direction: "descending" }],
    })
    .catch(() => null);

  if (!resp) return [];

  const out: HotTopic[] = [];
  for (const p of resp.results) {
    const page = p as unknown as {
      id: string;
      created_time: string;
      properties: Record<string, unknown>;
    };
    const title = getTitleFromProperty(page.properties.Title);
    if (!title) continue;
    out.push({
      id: page.id,
      title,
      url: getUrlFromProperty(page.properties.URL),
      platform: normalizePlatform(getSelectFromProperty(page.properties.Platform)),
      summary: getTextFromProperty(page.properties.Summary) || undefined,
      keywords: getMultiSelectFromProperty(page.properties.Keywords),
      createdAt: getDateFromProperty(page.properties.CreatedAt) ?? page.created_time,
    });
  }
  return out;
}

export async function createNotionHotTopic(input: Omit<HotTopic, "id">) {
  const notion = getClient();
  const ds = hotDataSourceId();
  const db = hotDbId();
  if (!notion || (!ds && !db)) return;

  const properties: Record<string, unknown> = {
    Title: {
      type: "title",
      title: [{ type: "text", text: { content: input.title } }],
    },
    CreatedAt: {
      type: "date",
      date: { start: input.createdAt },
    },
  };

  if (input.url) properties.URL = { type: "url", url: input.url };
  if (input.platform)
    properties.Platform = {
      type: "select",
      select: { name: platformLabel(input.platform) },
    };
  if (input.summary)
    properties.Summary = {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: input.summary } }],
    };
  if (input.keywords.length)
    properties.Keywords = {
      type: "multi_select",
      multi_select: input.keywords.map((k) => ({ name: k })),
    };

  await notion.pages.create({
    parent: db ? { database_id: db } : { data_source_id: ds as string },
    properties: properties as never,
  });
}

export async function listNotionMaterials(limit = 50): Promise<Material[]> {
  const notion = getClient();
  const ds = materialDataSourceId();
  const db = materialDbId();
  if (!notion || (!ds && !db)) return [];

  const dataSourceId = ds ?? (db ? await resolveDataSourceId(notion, db) : null);
  if (!dataSourceId) return [];

  const resp = await notion.dataSources
    .query({
      data_source_id: dataSourceId,
      page_size: Math.min(Math.max(limit, 1), 100),
      result_type: "page",
      sorts: [{ property: "CreatedAt", direction: "descending" }],
    })
    .catch(() => null);

  if (!resp) return [];

  const out: Material[] = [];
  for (const p of resp.results) {
    const page = p as unknown as {
      id: string;
      created_time: string;
      properties: Record<string, unknown>;
    };
    const title = getTitleFromProperty(page.properties.Title);
    if (!title) continue;
    out.push({
      id: page.id,
      title,
      url: getUrlFromProperty(page.properties.URL),
      sourceType: normalizeSourceType(getSelectFromProperty(page.properties.SourceType)),
      credibility: normalizeCredibility(getSelectFromProperty(page.properties.Credibility)),
      dynasties: normalizeDynasties(
        getMultiSelectFromProperty(page.properties.Dynasties),
      ),
      people: getMultiSelectFromProperty(page.properties.People),
      events: getMultiSelectFromProperty(page.properties.Events),
      dimensions: normalizeDimensions(
        getMultiSelectFromProperty(page.properties.Dimensions),
      ),
      excerpt: getTextFromProperty(page.properties.Excerpt) || undefined,
      notes: getTextFromProperty(page.properties.Notes) || undefined,
      createdAt: getDateFromProperty(page.properties.CreatedAt) ?? page.created_time,
    });
  }
  return out;
}

export async function createNotionMaterial(input: Omit<Material, "id">) {
  const notion = getClient();
  const ds = materialDataSourceId();
  const db = materialDbId();
  if (!notion || (!ds && !db)) return;

  const properties: Record<string, unknown> = {
    Title: {
      type: "title",
      title: [{ type: "text", text: { content: input.title } }],
    },
    SourceType: { type: "select", select: { name: input.sourceType } },
    Credibility: { type: "select", select: { name: input.credibility } },
    CreatedAt: { type: "date", date: { start: input.createdAt } },
  };

  if (input.url) properties.URL = { type: "url", url: input.url };
  if (input.dynasties.length)
    properties.Dynasties = {
      type: "multi_select",
      multi_select: input.dynasties.map((d) => ({ name: d })),
    };
  if (input.people.length)
    properties.People = {
      type: "multi_select",
      multi_select: input.people.map((p) => ({ name: p })),
    };
  if (input.events.length)
    properties.Events = {
      type: "multi_select",
      multi_select: input.events.map((e) => ({ name: e })),
    };
  if (input.dimensions.length)
    properties.Dimensions = {
      type: "multi_select",
      multi_select: input.dimensions.map((d) => ({ name: d })),
    };
  if (input.excerpt)
    properties.Excerpt = {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: input.excerpt } }],
    };
  if (input.notes)
    properties.Notes = {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: input.notes } }],
    };

  await notion.pages.create({
    parent: db ? { database_id: db } : { data_source_id: ds as string },
    properties: properties as never,
  });
}

function normalizePlatform(v?: string): HotTopic["platform"] {
  if (!v) return undefined;
  const t = PLATFORMS.find((p) => p.label === v)?.value;
  return t ?? undefined;
}

function platformLabel(p: NonNullable<HotTopic["platform"]>): string {
  return PLATFORMS.find((x) => x.value === p)?.label ?? p;
}

function normalizeSourceType(v?: string): Material["sourceType"] {
  if (!v) return SOURCE_TYPES[0];
  return (SOURCE_TYPES.includes(v as Material["sourceType"])
    ? (v as Material["sourceType"])
    : SOURCE_TYPES[0]) as Material["sourceType"];
}

function normalizeCredibility(v?: string): Material["credibility"] {
  if (!v) return CREDIBILITY_LEVELS[1];
  return (CREDIBILITY_LEVELS.includes(v as Material["credibility"])
    ? (v as Material["credibility"])
    : CREDIBILITY_LEVELS[1]) as Material["credibility"];
}

function normalizeDynasties(values: string[]): Material["dynasties"] {
  return values.filter((d): d is Material["dynasties"][number] =>
    DYNASTIES.includes(d as Material["dynasties"][number]),
  );
}

function normalizeDimensions(values: string[]): Material["dimensions"] {
  return values.filter((d): d is Material["dimensions"][number] =>
    DIMENSIONS.includes(d as Material["dimensions"][number]),
  );
}

