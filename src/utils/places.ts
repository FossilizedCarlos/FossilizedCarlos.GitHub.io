import type { CollectionEntry } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import type { MapPlace } from "@/components/PlacesMap.astro";
import { getAssetPath } from "./withBase";
import config from "@/config";

export function getPlaceUrl(
  id: string,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, `places/${id}`);
}

/**
 * Image paths in the Hugo content include the old `/Blowfish` base path.
 * Drop it and apply this site's base instead.
 */
export function getPlaceImageSrc(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  return getAssetPath(src.replace(/^\/Blowfish(?=\/)/, ""));
}

/** Plain-text summary of a place's markdown body. */
export function getPlaceSummary(place: CollectionEntry<"places">): string {
  return (place.body ?? "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function toMapPlace(
  place: CollectionEntry<"places">,
  locale?: string
): MapPlace {
  const { data } = place;
  return {
    title: data.placeName ?? data.title,
    lat: data.lat,
    lon: data.lon,
    url: getPlaceUrl(place.id, locale),
    country: data.country,
    location: data.placeLocation ?? data.country,
    summary: getPlaceSummary(place),
  };
}
