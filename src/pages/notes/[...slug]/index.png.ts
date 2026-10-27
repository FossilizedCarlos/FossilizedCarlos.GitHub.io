import { getCollection } from "astro:content";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

export { GET } from "../../posts/[...slug]/index.png";

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const notes = await getCollection("notes").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return notes.map(note => ({
    params: { slug: getPostSlug(note.id, note.filePath, "notes") },
    props: note,
  }));
}
