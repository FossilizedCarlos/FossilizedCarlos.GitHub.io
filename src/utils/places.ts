import type { ImageMetadata } from "astro";
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

/** Place photos kept in src/assets/places/, which Astro can resize. */
const placePhotos = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/places/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}",
  { eager: true }
);

/**
 * Finds the photo for a front-matter path such as
 * `/Blowfish/assets/img/places/babel/babel-1.jpeg` in
 * `src/assets/places/babel/babel-1.jpeg`. Returns undefined when the photo
 * is only in public/, which is then used as it is, without resizing.
 */
export function getPlacePhoto(src: string): ImageMetadata | undefined {
  const relative = src
    .replace(/^\/Blowfish(?=\/)/, "")
    .replace(/^\/assets\/img\/places\//, "");
  return placePhotos[`/src/assets/places/${relative}`]?.default;
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
