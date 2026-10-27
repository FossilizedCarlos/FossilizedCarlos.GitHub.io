import { type CollectionEntry, getCollection } from "astro:content";

type DatedCollection = "micro" | "places";

/** Non-draft entries of a dated collection, newest first. */
export async function getSortedEntries<C extends DatedCollection>(
  collection: C
): Promise<CollectionEntry<C>[]> {
  const entries = (await getCollection(collection)) as CollectionEntry<C>[];
  return entries
    .filter(({ data }) => !data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
