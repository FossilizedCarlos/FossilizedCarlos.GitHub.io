import { defineCollection, type SchemaContext } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";
import { slugifyStr } from "@/utils/slugify";

export const BLOG_PATH = "src/content/posts";
export const NOTES_PATH = "src/content/notes";

/**
 * Page bundles (`my-post/index.md`) get the folder name as their id,
 * so Hugo-style bundles and flat files produce the same URLs.
 * File names with spaces become URL slugs (`My Note.md` → `my-note`).
 */
const bundleId = ({ entry }: { entry: string }) =>
  entry
    .replace(/(\/index)?\.mdx?$/, "")
    .split("/")
    .map(slugifyStr)
    .join("/");

/**
 * Blog posts and notes share one schema. Hugo front matter uses `date`,
 * AstroPaper uses `pubDatetime`; either is accepted.
 */
const articleSchema = ({ image }: SchemaContext) =>
  z.preprocess(
    value => {
      const data = value as Record<string, unknown>;
      return { ...data, pubDatetime: data.pubDatetime ?? data.date };
    },
    z.object({
      author: z.string().default(config.site.author),
      pubDatetime: z.coerce.date(),
      modDatetime: z.coerce.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string().default(""),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    })
  );

const posts = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: `./${BLOG_PATH}`,
    generateId: bundleId,
  }),
  schema: articleSchema,
});

const notes = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: `./${NOTES_PATH}`,
    generateId: bundleId,
  }),
  schema: articleSchema,
});

const micro = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/micro" }),
  schema: z.object({
    title: z.string().optional(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
  }),
});

const places = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/places" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
    lat: z.number(),
    lon: z.number(),
    /** `visit: no` marks a place I'd like to visit but haven't yet. */
    visit: z.preprocess(
      value =>
        typeof value === "string"
          ? !/^(no|n|false|off)$/i.test(value.trim())
          : value,
      z.boolean().default(true)
    ),
    country: z.string().optional(),
    countryCode: z.string().optional(),
    placeName: z.string().optional(),
    placeLocation: z.string().optional(),
    placeAddress: z.string().optional(),
    appleMaps: z.string().optional(),
    openStreetMap: z.string().optional(),
    placeImages: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string().optional(),
          caption: z.string().optional(),
        })
      )
      .default([]),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

export const collections = { posts, notes, micro, places, pages };
