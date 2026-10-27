import { getRelativeLocaleUrl } from "astro:i18n";
import { BLOG_PATH, NOTES_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";
import config from "@/config";

/** Collections rendered with the article layout, and their URL prefix. */
export type ArticleSection = "posts" | "notes";

const SECTION_PATHS: Record<ArticleSection, string> = {
  posts: BLOG_PATH,
  notes: NOTES_PATH,
};

function getPostPathSegments(
  filePath: string | undefined,
  section: ArticleSection
): string[] {
  const segments =
    filePath
      ?.replace(SECTION_PATHS[section], "")
      .split("/")
      .filter(path => path !== "")
      .filter(path => !path.startsWith("_")) ?? [];

  // A page bundle (`my-post/index.md`) is named by its folder, which is
  // already the entry id, so drop the folder as well as the file name.
  const isBundle = /^index\.mdx?$/.test(segments[segments.length - 1] ?? "");

  return segments
    .slice(0, isBundle ? -2 : -1)
    .map(segment => slugifyStr(segment));
}

function getIdSlug(id: string): string {
  const postId = id.split("/");
  return postId.length > 0 ? String(postId[postId.length - 1]) : id;
}

function getPostSlugPath(
  id: string,
  filePath: string | undefined,
  section: ArticleSection
): string {
  const pathSegments = getPostPathSegments(filePath, section);
  const slug = getIdSlug(id);
  return pathSegments.length > 0
    ? [...pathSegments, slug].join("/")
    : String(slug);
}

/**
 * Returns the slug-only path for use as a route param in `getStaticPaths`.
 * No base prefix, no locale — Astro handles those at a higher level.
 * e.g. `/examples/my-post`
 */
export function getPostSlug(
  id: string,
  filePath: string | undefined,
  section: ArticleSection = "posts"
): string {
  return `/${getPostSlugPath(id, filePath, section)}`;
}

/**
 * Returns a fully navigable URL for use in `<a href>` and RSS links.
 * Applies both locale routing and the configured Astro base via
 * `getRelativeLocaleUrl`.
 * e.g. `/posts/my-post` or `/en/notes/my-note`
 */
export function getPostUrl(
  id: string,
  filePath: string | undefined,
  locale: string | undefined = config.site.lang,
  section: ArticleSection = "posts"
): string {
  return getRelativeLocaleUrl(
    locale,
    `${section}/${getPostSlugPath(id, filePath, section)}`
  );
}
