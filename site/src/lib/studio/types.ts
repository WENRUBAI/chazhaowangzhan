export type Platform = "weibo" | "douyin" | "wechat" | "xiaohongshu" | "bilibili";

export type Dynasty =
  | "先秦"
  | "秦汉"
  | "魏晋南北朝"
  | "隋唐"
  | "宋元"
  | "明清";

export type SimilarityDimension =
  | "权力"
  | "财政"
  | "战争"
  | "外交"
  | "民生"
  | "舆论"
  | "制度"
  | "技术";

export type SourceType = "史料" | "研究" | "解读" | "新闻";

export type Credibility = "高" | "中" | "低";

export type Citation = {
  work: string;
  locator?: string;
  canonicalUrl?: string;
};

export type HotTopic = {
  id: string;
  title: string;
  url?: string;
  platform?: Platform;
  summary?: string;
  keywords: string[];
  createdAt: string;
};

export type Material = {
  id: string;
  title: string;
  url?: string;
  citation?: Citation;
  sourceType: SourceType;
  credibility: Credibility;
  dynasties: Dynasty[];
  people: string[];
  events: string[];
  dimensions: SimilarityDimension[];
  excerpt?: string;
  notes?: string;
  createdAt: string;
};

export type CompareCard = {
  id: string;
  topicId?: string;
  topicTitle: string;
  dynasties: Dynasty[];
  eventTitle: string;
  timeline?: string;
  coreConflict?: string;
  keyPeople: string[];
  outcome?: string;
  controversies?: string;
  sources: Array<{ title: string; url?: string }>;
  createdAt: string;
};

export type ScriptSegment = {
  key:
    | "hook"
    | "hot"
    | "background"
    | "history"
    | "mapping"
    | "closing";
  title: string;
  targetSeconds: number;
  text: string;
  citations: Array<{ title: string; url?: string }>;
};

export type ScriptDraft = {
  id: string;
  title: string;
  topicId?: string;
  topicTitle: string;
  segments: ScriptSegment[];
  createdAt: string;
};

export const DYNASTIES: Dynasty[] = ["先秦", "秦汉", "魏晋南北朝", "隋唐", "宋元", "明清"];

export const DIMENSIONS: SimilarityDimension[] = [
  "权力",
  "财政",
  "战争",
  "外交",
  "民生",
  "舆论",
  "制度",
  "技术",
];

export const PLATFORMS: Array<{ value: Platform; label: string }> = [
  { value: "weibo", label: "微博" },
  { value: "douyin", label: "抖音" },
  { value: "wechat", label: "微信" },
  { value: "xiaohongshu", label: "小红书" },
  { value: "bilibili", label: "B站" },
];

export const SOURCE_TYPES: SourceType[] = ["史料", "研究", "解读", "新闻"];
export const CREDIBILITY_LEVELS: Credibility[] = ["高", "中", "低"];

