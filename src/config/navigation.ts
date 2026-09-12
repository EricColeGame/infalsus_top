import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  key: string;
  path: `/${string}`;
  icon?: LucideIcon;
  isContentType: boolean;
}

export const NAVIGATION_CONFIG = [] satisfies readonly NavigationItem[];

export const CONTENT_TYPES = NAVIGATION_CONFIG.filter((item) => (item as NavigationItem).isContentType).map((item) => (item as NavigationItem).path.replace(/^\//, ""));
