import { getCollection } from "astro:content";
import { type ArticleSection, getPostSlug } from "./getPostPaths";
import { getSortedPosts } from "./getSortedPosts";

/** `getStaticPaths` result for the detail pages of a blog or notes section. */
export async function getArticlePaths(section: ArticleSection) {
  const sortedPosts = getSortedPosts(await getCollection(section));

  const adjacent = (index: number) => {
    const post = sortedPosts[index];
    return post
      ? { id: post.id, title: post.data.title, filePath: post.filePath }
      : null;
  };

  return sortedPosts.map((post, index) => ({
    params: { slug: getPostSlug(post.id, post.filePath, section) },
    props: {
      post,
      section,
      // sortedPosts is newest-first, so "older" (prev) is a higher index
      // and "newer" (next) is a lower index.
      prevPost: adjacent(index + 1),
      nextPost: index > 0 ? adjacent(index - 1) : null,
    },
  }));
}
