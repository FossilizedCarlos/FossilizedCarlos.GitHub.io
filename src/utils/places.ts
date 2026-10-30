import type { CollectionEntry } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import type { MapPlace } from "@/components/PlacesMap.astro";
import config from "@/config";

export function getPlaceUrl(
  id: string,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, `places/${id}`);
}

/**
 * Photos per row for a place gallery: rows of 3, then rows of 2 at the end,
 * so no row holds a single photo (4 → 2+2, 5 → 3+2, 7 → 3+2+2).
 * One photo gets a row of its own.
 */
export function getGalleryRows(count: number): number[] {
  if (count <= 3) return count > 0 ? [count] : [];
  const rows: number[] = [];
  let left = count;
  while (left > 0) {
    if (left === 4) return [...rows, 2, 2];
    if (left === 2) return [...rows, 2];
    rows.push(3);
    left -= 3;
  }
  return rows;
}

/** Plain-text paragraphs of a place's markdown body. */
export function getPlaceParagraphs(place: CollectionEntry<"places">): string[] {
  return (place.body ?? "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Plain-text summary of a place's markdown body. */
export function getPlaceSummary(place: CollectionEntry<"places">): string {
  return getPlaceParagraphs(place).join(" ");
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
    visited: data.visit,
    url: getPlaceUrl(place.id, locale),
    country: data.country,
    location: data.placeLocation ?? data.country,
    // The first paragraph keeps the map popup short.
    summary: getPlaceParagraphs(place)[0],
  };
}
