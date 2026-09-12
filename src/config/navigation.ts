import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  key: string;
  path: `/${string}`;
  icon?: LucideIcon;
  isContentType: boolean;
}

export const NAVIGATION_CONFIG = [
  {
    path: "/release",
    key: "release",
    isContentType: true,
  },
  {
    path: "/guide",
    key: "guide",
    isContentType: true,
  },
  {
    path: "/access",
    key: "access",
    isContentType: true,
  },
  {
    path: "/features",
    key: "features",
    isContentType: true,
  },
  {
    path: "/community",
    key: "community",
    isContentType: true,
  },
  {
    path: "/codes",
    key: "codes",
    isContentType: true,
  },
] satisfies readonly NavigationItem[];

export const CONTENT_TYPES = NAVIGATION_CONFIG.filter((item) => (item as NavigationItem).isContentType).map((item) => (item as NavigationItem).path.replace(/^\//, ""));
