import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";

const messagesMap: Record<Locale, Record<string, unknown>> = {
  "de": de,
  "en": en,
  "es": es,
  "fr": fr,
};

type Messages = typeof en;

function deepMerge<T>(base: T, override: Partial<T>): T {
  if (
    typeof base !== "object" ||
    base === null ||
    typeof override !== "object" ||
    override === null
  ) {
    return (override as T) ?? base;
  }

  if (Array.isArray(base)) {
    return (Array.isArray(override) ? override : base) as T;
  }

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };

  for (const key of Object.keys(override as Record<string, unknown>)) {
    const baseValue = (base as Record<string, unknown>)[key];
    const overrideValue = (override as Record<string, unknown>)[key];
    if (overrideValue === undefined) continue;
    result[key] = deepMerge(baseValue as never, overrideValue as never);
  }

  return result as T;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? (requested as Locale)
    : routing.defaultLocale;

  const localeMessages = (messagesMap[locale] || {}) as Partial<Messages>;
  const messages = locale === "en" ? en : deepMerge(en, localeMessages);
  return { locale, messages };
});
