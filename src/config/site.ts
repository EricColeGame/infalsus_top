export interface SiteConfig {
  name: string;
  shortName: string;
  logoText: string;
  tagline: string;
  description: string;
  url: string;
  gameUrl?: string;
  heroVideoId?: string;
  social?: {
    discord?: string;
    youtube?: string;
    twitter?: string;
    tiktok?: string;
  };
  locales: readonly string[];
  defaultLocale: string;
}

export const siteConfig: SiteConfig = {
  name: "In Falsus Wiki",
  shortName: "In Falsus",
  logoText: "IF",
  tagline: "Guides, Characters, Cards & Mechanics",
  description: "Complete In Falsus Wiki with gameplay guides, character details, card crafting, mechanics, song lists, and essential resources for players.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://infalsus.top",
  gameUrl: "https://store.steampowered.com/app/3971950/In_Falsus/",
  heroVideoId: "aSu1FqP1FYI", // In Falsus - Gameplay Trailer
  social: {
    discord: "https://discord.gg/lowiro",
    youtube: "https://www.youtube.com/@lowiro",
  },
  locales: ["en", "es", "pt", "de", "fr"],
  defaultLocale: "en",
};
