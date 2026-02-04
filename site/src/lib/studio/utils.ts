import type { Platform } from "@/lib/studio/types";

export function nowIso(): string {
  return new Date().toISOString();
}

export function randomId(prefix: string): string {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${base}`;
}

export function inferPlatform(url: string): Platform | undefined {
  const host = safeHost(url);
  if (!host) return undefined;
  if (host.includes("weibo.com")) return "weibo";
  if (host.includes("douyin.com")) return "douyin";
  if (host.includes("mp.weixin.qq.com")) return "wechat";
  if (host.includes("xiaohongshu.com") || host.includes("xhslink.com"))
    return "xiaohongshu";
  if (host.includes("bilibili.com")) return "bilibili";
  return undefined;
}

export function safeHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

