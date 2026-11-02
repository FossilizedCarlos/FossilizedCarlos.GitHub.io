import { defineCollection, type SchemaContext } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";

export const BLOG_PATH = "src/content/posts";
export const NOTES_PATH = "src/content/notes";
export const AGENTS_PATH = "src/content/agents";

/** Blog posts and notes share one schema. */
const articleSchema = ({ image }: SchemaContext) =>
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
  });

const posts = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: `./${BLOG_PATH}`,
  }),
  schema: articleSchema,
});

const notes = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: `./${NOTES_PATH}`,
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
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
    lat: z.number(),
    lon: z.number(),
    /** `visit: false` marks a place I'd like to visit but haven't yet. */
    visit: z.boolean().default(true),
    country: z.string().optional(),
    countryCode: z.string().optional(),
    placeName: z.string().optional(),
    placeLocation: z.string().optional(),
    placeAddress: z.string().optional(),
    appleMaps: z.string().optional(),
    openStreetMap: z.string().optional(),
    /** Paths relative to the place file, e.g. `../../assets/places/babel/babel-1.jpeg`. */
    placeImages: z
      .array(
        z.object({
          src: image(),
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

/**
 * Unlisted agent notes at /agents/. Nothing else on the site links here.
 * Hugo front matter (`date`, `lastmod`, `summary`, author lists) maps onto
 * the article schema, so posts can be copied over as-is.
 */
const agents = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${AGENTS_PATH}` }),
  schema: (context: SchemaContext) =>
    z.preprocess(
      raw => {
        const { date, lastmod, author, ...data } = raw as Record<string, unknown>;
        // A Hugo date like "2026-07-03" would be midnight UTC, which is the
        // day before in American timezones. Noon UTC keeps the same day.
        const day = (value: unknown) =>
          typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? `${value}T12:00:00Z`
            : value;
        return {
          ...data,
          pubDatetime: data.pubDatetime ?? day(date),
          modDatetime: data.modDatetime ?? day(lastmod),
          author: Array.isArray(author) ? author.join(", ") : author,
          description: data.description ?? data.summary,
          // The edit link would point at a file that is never committed.
          hideEditPost: data.hideEditPost ?? true,
        };
      },
      articleSchema(context).extend({
        summary: z.string().optional(),
        pin: z.boolean().optional(),
      })
    ),
});

export const collections = { posts, notes, micro, places, pages, agents };
