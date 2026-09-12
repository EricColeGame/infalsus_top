import fs from "fs";
import path from "path";
import React from "react";
import { CONTENT_TYPES as CONFIG_CONTENT_TYPES } from "@/config/navigation";
import { routing, type Locale } from "@/i18n/routing";

// 从统一配置导入内容类型
export const CONTENT_TYPES = CONFIG_CONTENT_TYPES;

/**
 * 将文件名转换为 URL-safe slug
 * 所有非字母数字连字符下划线的字符（冒号、问号、井号、空格等）替换为 -
 * 合并连续的 -，去掉首尾 -
 */
export function fileNameToSlug(fileName: string): string {
  return fileName
    .replace(/\.mdx$/, "")
    .replace(/[^a-zA-Z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * 根据 slug 在目录中反查真实文件名（不含 .mdx）
 * 例如 slug="gelum-boss" → 返回 "gelum:boss"
 */
export function findFileBySlug(dir: string, slug: string, basePath: string[] = []): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const result = findFileBySlug(fullPath, slug, [...basePath, entry.name]);
      if (result) return result;
    } else if (entry.name.endsWith(".mdx")) {
      const fileName = entry.name.replace(".mdx", "");
      const entrySlug = [...basePath, fileNameToSlug(fileName)].join("/");
      if (entrySlug === slug) {
        return [...basePath, fileName].join("/");
      }
    }
  }
  return null;
}

// 通用 Metadata 接口（与 MDX 文件 export const metadata 对应）
export interface ContentMetadata {
  title: string;
  description: string;
  category: string;
  date: string;
  lastModified?: string;
  image?: string;
  badge?: string;
  summary?: string;
}

// Heading 结构（从 MDX 源文件提取）
export interface Heading {
  id: string;
  text: string;
  level: number;
}

// 内容项接口
export interface ContentItem {
  slug: string;
  segments: string[];
  contentType: string;
  locale: Locale;
  metadata: ContentMetadata;
}

// 内容数据接口（含 MDX 组件）
export type ContentData = {
  slug: string;
  segments: string[];
  contentType: string;
  locale: Locale;
  metadata: ContentMetadata;
  MDXContent: React.ComponentType;
  headings: Heading[];
};

const CONTENT_ROOT = path.join(process.cwd(), "content");

/**
 * 从 MDX 源文件中提取 ## 和 ### 标题
 */
function extractHeadings(mdxSource: string): Heading[] {
  const headings: Heading[] = [];
  const lines = mdxSource.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\{[^}]*\}/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      headings.push({ id, text, level });
    }
  }
  return headings;
}

/**
 * 读取 MDX 源文件并提取 headings
 */
function getHeadingsFromFile(filePath: string): Heading[] {
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    return extractHeadings(source);
  } catch {
    return [];
  }
}

/**
 * 从 MDX 源文件中提取 metadata (基于正则或默认生成)
 */
function getMetadataFromFile(filePath: string, defaultSlug: string, contentType: string): ContentMetadata {
  const defaultMeta: ContentMetadata = {
    title: defaultSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Complete guide and details about ${defaultSlug.replace(/-/g, " ")}.`,
    category: contentType,
    date: new Date().toISOString().split("T")[0],
  };

  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const titleMatch = source.match(/title:\s*["'](.+?)["']/);
    if (titleMatch) defaultMeta.title = titleMatch[1];
    const descMatch = source.match(/description:\s*["'](.+?)["']/);
    if (descMatch) defaultMeta.description = descMatch[1];
    const badgeMatch = source.match(/badge:\s*["'](.+?)["']/);
    if (badgeMatch) defaultMeta.badge = badgeMatch[1];
  } catch {}

  return defaultMeta;
}

/**
 * 辅助函数：递归获取目录下所有 MDX 文件的 slug 路径
 */
function getSlugsFromDirectory(dir: string, basePath: string[] = []): string[][] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const paths: string[][] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      paths.push(...getSlugsFromDirectory(fullPath, [...basePath, entry.name]));
    } else if (entry.name.endsWith(".mdx")) {
      const fileName = entry.name.replace(".mdx", "");
      paths.push([...basePath, fileNameToSlug(fileName)]);
    }
  }
  return paths;
}

/**
 * 获取所有内容列表（支持递归读取嵌套目录）
 */
export async function getAllContent(contentType: string, language: Locale): Promise<ContentItem[]> {
  const contentDir = path.join(CONTENT_ROOT, language, contentType);
  if (!fs.existsSync(contentDir)) return [];

  const slugPaths = getSlugsFromDirectory(contentDir);
  const items: ContentItem[] = [];

  for (const segments of slugPaths) {
    const slug = segments.join("/");
    const realSlug = findFileBySlug(contentDir, slug) || slug;
    const mdxPath = path.join(contentDir, `${realSlug}.mdx`);
    if (!fs.existsSync(mdxPath)) continue;

    items.push({
      slug,
      segments,
      contentType,
      locale: language,
      metadata: getMetadataFromFile(mdxPath, slug, contentType),
    });
  }

  return items.sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));
}

/**
 * 获取单个内容项（含 MDX 渲染后的内容组件）
 */
export async function getContent(contentType: string, slugSegments: string[], language: Locale): Promise<ContentData | null> {
  const currentSlug = slugSegments.join("/");
  let targetLocale: Locale = language;
  let contentDir = path.join(CONTENT_ROOT, targetLocale, contentType);
  let realSlug = findFileBySlug(contentDir, currentSlug);

  // Fallback 到默认英文语言
  if (!realSlug && targetLocale !== routing.defaultLocale) {
    targetLocale = routing.defaultLocale;
    contentDir = path.join(CONTENT_ROOT, targetLocale, contentType);
    realSlug = findFileBySlug(contentDir, currentSlug);
  }

  if (!realSlug) return null;

  const mdxPath = path.join(contentDir, `${realSlug}.mdx`);
  if (!fs.existsSync(mdxPath)) return null;

  try {
    // 统一以静态相对路径进行有限导入
    const mod = await import(`../../content/${targetLocale}/${contentType}/${realSlug}.mdx`);
    return {
      slug: currentSlug,
      segments: slugSegments,
      contentType,
      locale: targetLocale,
      metadata: (mod.metadata as ContentMetadata) || getMetadataFromFile(mdxPath, currentSlug, contentType),
      MDXContent: mod.default,
      headings: getHeadingsFromFile(mdxPath),
    };
  } catch {
    // 容错处理：若动态模块未编译，返回安全占位组件
    const meta = getMetadataFromFile(mdxPath, currentSlug, contentType);
    return {
      slug: currentSlug,
      segments: slugSegments,
      contentType,
      locale: targetLocale,
      metadata: meta,
      MDXContent: () => React.createElement("div", { className: "prose max-w-none" }, meta.description),
      headings: getHeadingsFromFile(mdxPath),
    };
  }
}

/**
 * 导航分组结构（用于动态 Wiki Navigation）
 */
export interface NavGroup {
  title: string;
  count: number;
  slug: string;
  links: Array<{ label: string; href: string; badge?: string }>;
}

// 分组标题映射：slug → 人类可读标题（默认英文）
const GROUP_TITLES: Record<string, string> = {
  release: "Release",
  guide: "Guide",
  access: "Access",
  features: "Features",
  community: "Community",
  codes: "Codes",
};

// 德语分组标题映射
const GROUP_TITLES_DE: Record<string, string> = {
  release: "Veröffentlichung",
  guide: "Leitfaden",
  access: "Zugang",
  features: "Features",
  community: "Community",
  codes: "Codes",
};

// 西班牙语分组标题映射
const GROUP_TITLES_ES: Record<string, string> = {
  release: "Lanzamiento",
  guide: "Guía",
  access: "Acceso",
  features: "Características",
  community: "Comunidad",
  codes: "Códigos",
};

// 法语分组标题映射
const GROUP_TITLES_FR: Record<string, string> = {
  release: "Sortie",
  guide: "Guide",
  access: "Accès",
  features: "Fonctionnalités",
  community: "Communauté",
  codes: "Codes",
};

// locale → 分组标题映射
const GROUP_TITLES_BY_LOCALE: Record<string, Record<string, string>> = {
  de: GROUP_TITLES_DE,
  es: GROUP_TITLES_ES,
  fr: GROUP_TITLES_FR,
};

// locale → "Overview" 翻译
const OVERVIEW_LABEL_BY_LOCALE: Record<string, string> = {
  de: "Übersicht",
  es: "Resumen",
  fr: "Aperçu",
};

// 分组排序顺序
const GROUP_ORDER: string[] = [
  "release", "guide", "access", "features", "community", "codes",
];

/**
 * 动态生成 Wiki Navigation 分组
 */
export function getDynamicNavigation(language: Locale = "en"): NavGroup[] {
  const localeDir = path.join(CONTENT_ROOT, language);
  if (!fs.existsSync(localeDir)) return [];

  const entries = fs.readdirSync(localeDir, { withFileTypes: true });
  const groups: NavGroup[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const groupSlug = entry.name;
    if (!CONTENT_TYPES.includes(groupSlug as typeof CONTENT_TYPES[number])) continue;
    const groupDir = path.join(localeDir, groupSlug);
    const slugPaths = getSlugsFromDirectory(groupDir);

    if (slugPaths.length === 0) continue;

    const links: NavGroup["links"] = [];
    const overviewLabel = OVERVIEW_LABEL_BY_LOCALE[language] || "Overview";
    links.push({ label: overviewLabel, href: `/${groupSlug}` });

    for (const segments of slugPaths) {
      const articleSlug = segments.join("/");
      const mdxFilePath = findFileBySlug(groupDir, articleSlug);
      if (!mdxFilePath) continue;

      const fullPath = path.join(groupDir, `${mdxFilePath}.mdx`);
      let title = segments[segments.length - 1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      let badge: string | undefined;

      try {
        const source = fs.readFileSync(fullPath, "utf-8");
        const titleMatch = source.match(/title:\s*["'](.+?)["']/);
        if (titleMatch) title = titleMatch[1];
        const badgeMatch = source.match(/badge:\s*["'](.+?)["']/);
        if (badgeMatch) badge = badgeMatch[1];
      } catch {}

      links.push({ label: title, href: `/${groupSlug}/${articleSlug}`, badge });
    }

    const localTitles = GROUP_TITLES_BY_LOCALE[language] || {};
    const groupTitle = localTitles[groupSlug] || GROUP_TITLES[groupSlug] || groupSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    groups.push({
      title: groupTitle,
      count: links.length - 1,
      slug: groupSlug,
      links,
    });
  }

  groups.sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.slug);
    const bi = GROUP_ORDER.indexOf(b.slug);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return groups;
}

/**
 * 获取所有内容路径（用于 generateStaticParams）
 */
export async function getAllContentPaths(language: Locale) {
  const localeDir = path.join(CONTENT_ROOT, language);
  if (!fs.existsSync(localeDir)) return [];

  const entries = fs.readdirSync(localeDir, { withFileTypes: true });
  const contentTypeDirs = entries.filter((entry) => entry.isDirectory());

  const paths = contentTypeDirs.flatMap((entry) => {
    const segments = getSlugsFromDirectory(path.join(localeDir, entry.name));
    return segments.map((slug) => ({ contentType: entry.name, slug }));
  });

  return paths;
}
