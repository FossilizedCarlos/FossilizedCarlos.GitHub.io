import { getCollection } from "astro:content";
import { getPostSlug } from "@/utils/getPostPaths";
import config from "@/config";

export { GET } from "../../posts/[...slug]/index.png";

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const agents = await getCollection("agents").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return agents.map(agent => ({
    params: { slug: getPostSlug(agent.id, agent.filePath, "agents") },
    props: agent,
  }));
}
