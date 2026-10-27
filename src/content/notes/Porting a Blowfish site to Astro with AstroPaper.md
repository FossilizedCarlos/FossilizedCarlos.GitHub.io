---
title: "Porting a Blowfish site to Astro with AstroPaper"
date: 2026-10-27T18:00:00+03:00
description: How to move a Hugo Blowfish site with Blog, Notes, Micro, Places, and About sections to Astro and the AstroPaper theme, without changes to the markdown files.
tags:
- astro
- hugo
- astropaper
---

This note describes how to move a Hugo site that uses the [Blowfish](https://blowfish.page) theme to [Astro](https://astro.build) with the [AstroPaper](https://github.com/satnaing/astro-paper) theme.

The new site keeps the five sections of the old site: Blog, Notes, Micro, Places, and About. It uses the AstroPaper look. The markdown files from Hugo go into the new site without changes.

## Table of contents

## Scope

The procedure in this note does these tasks:

- It copies the Hugo content into Astro content collections.
- It adds Notes, Micro, and Places sections to AstroPaper. AstroPaper has only a Blog section.
- It renders the Hugo shortcodes that the content uses.
- It runs all Node.js tools in a Linux container, not on macOS.

The procedure does not port the syndication of micro posts. An external tool writes the micro posts, and the site only shows them.

## Starting point

The Hugo site has this structure:

| Hugo folder | Content |
| --- | --- |
| `content/posts/` | Blog posts as page bundles (`my-post/index.md`) |
| `content/notes/` | Notes as page bundles |
| `content/micro/` | Micro posts, one file for each post |
| `content/places/` | Places, with `lat` and `lon` in the front matter |
| `content/about.md` | About page |
| `static/assets/img/` | Images |
| `assets/icons/` | SVG icons for Mastodon, Bluesky, Micro.blog, and maps |

The content uses four Hugo shortcodes:

| Shortcode | Use |
| --- | --- |
| `micro-social` | A link to the copy of a micro post on Mastodon, Bluesky, or Micro.blog |
| `prompt` | A box that shows an LLM prompt |
| `alert` | A box that shows a note |
| `center-image` | An image in the center of the page |

A micro post looks like this:

```md
---
title: "Micro 72"
date: 2026-10-24T20:33:48+03:00
draft: false
---

Apple's container machine has been so nice...

Also posted to
{{< micro-social microblog "https://fossilizedcarlos.micro.blog/..." >}}
{{< micro-social mastodon "https://mastodon.social/@FossilzedCarlos/..." >}}
{{< micro-social bluesky "https://bsky.app/profile/..." >}}
```

## Requirements

- A Mac with Apple `container` (version 1.6 or later).
- The image `node:24-alpine`.
- A container machine with Node.js 24. In this note, the machine has the name `astro`.
- Git.

> [!NOTE]
> The container machine mounts your home folder at the same path. Thus, commands that you run in the machine use the files in your project folder.

## Procedure

### 1. Get AstroPaper

1. Go to the folder for the new site.
2. Clone AstroPaper into a temporary folder.
3. Remove the Git history of AstroPaper.
4. Move the files into the site folder.

```sh
cd ~/Developer/Astro/"Astro Blowfish"
git clone --depth 1 https://github.com/satnaing/astro-paper.git ap
rm -rf ap/.git
mv ap/* ap/.[!.]* . && rmdir ap
```

AstroPaper 6 uses Astro 7, Tailwind CSS 4, and pnpm.

### 2. Install the dependencies in a container

Run `pnpm install` in a `node:24-alpine` container. This does not install Node.js or pnpm on macOS.

```sh
container run --rm \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 -e CI=true \
  -v "$PWD:/app" -w /app node:24-alpine \
  sh -c "corepack enable && pnpm install --frozen-lockfile"
```

Set a flat `node_modules` folder in `pnpm-workspace.yaml` before you install:

```yaml
allowBuilds:
  esbuild: true
  sharp: true

# Flat node_modules, so packages never resolve from ~/Developer/Astro/node_modules.
nodeLinker: hoisted
```

> [!CAUTION]
> Without `nodeLinker: hoisted`, the build can fail in the container machine. The machine can see `~/Developer/Astro/node_modules`. Node.js then finds the wrong version of a package in that folder. Refer to [Problems and solutions](#problems-and-solutions).

### 3. Remove the sample content

Remove the sample posts of AstroPaper from `src/content/posts/`. Remove the sample images from `src/assets/images/`. Remove `public/default-og.jpg`. Without this file, the site makes social images for each page.

### 4. Copy the content

Copy the Hugo files into the Astro folders. Do not change the files.

| Hugo source | Astro destination |
| --- | --- |
| `content/posts/<slug>/index.md` | `src/content/posts/<slug>/index.md` |
| `content/notes/<slug>/index.md` | `src/content/notes/<slug>/index.md` |
| `content/micro/*.md` | `src/content/micro/` |
| `content/places/*.md` | `src/content/places/` |
| `content/about.md` | `src/content/pages/about.md` |
| `static/assets/img/` | `public/assets/img/` |
| `assets/img/Carlos.png` | `src/assets/images/Carlos.png` |
| `assets/icons/mastodon.svg`, `bluesky.svg`, `microblog.svg` | `src/assets/icons/socials/` |
| `assets/icons/apple.svg`, `openstreetmap.svg` | `src/assets/icons/IconApple.svg`, `IconOpenStreetMap.svg` |

Do not copy the `_index.md` files. The Astro pages show their text.

For `about.md`, keep the body. Replace the front matter with the front matter that AstroPaper uses:

```md
---
title: "About This Site"
description: "About page."
---
```

### 5. Configure the site

Set the site data in `astro-paper.config.ts`:

```ts
export default defineAstroPaperConfig({
  site: {
    url: "https://www.carlosbarboza.me/",
    title: "Carlos E. Barboza",
    description:
      "Engineer, iOS Developer, Tri Age Grouper, and Cappuccino explorer.",
    author: "Carlos E. Barboza",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "America/Chicago",
  },
  posts: { perPage: 10, perIndex: 2 },
  features: {
    showArchives: false,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [
    { name: "mastodon",  url: "https://mastodon.social/@FossilzedCarlos" },
    { name: "bluesky",   url: "https://bsky.app/profile/fossilizedcarlos.bsky.social" },
    { name: "microblog", url: "https://micro.blog/fossilizedcarlos" },
    { name: "github",    url: "https://github.com/FossilizedCarlos" },
    { name: "linkedin",  url: "https://linkedin.com/in/cebarboza" },
  ],
  shareLinks: [],
});
```

The `name` of each social link must be the same as an SVG file name in `src/assets/icons/socials/`.

### 6. Define the content collections

Edit `src/content.config.ts`. Make five collections: `posts`, `notes`, `micro`, `places`, and `pages`.

Hugo uses `date` in the front matter. AstroPaper uses `pubDatetime`. The schema for posts and notes accepts the two names:

```ts
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
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string().default(""),
      // ...the other AstroPaper fields
    })
  );
```

Hugo page bundles have the name `index.md`. The default ID of the entry is then `my-post/index`. This function gives the folder name as the ID. It also changes a file name with spaces into a URL slug:

```ts
const bundleId = ({ entry }: { entry: string }) =>
  entry
    .replace(/(\/index)?\.mdx?$/, "")
    .split("/")
    .map(slugifyStr)
    .join("/");

const notes = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/notes",
    generateId: bundleId,
  }),
  schema: articleSchema,
});
```

The `micro` collection needs only a date:

```ts
const micro = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/micro" }),
  schema: z.object({
    title: z.string().optional(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
  }),
});
```

The `places` collection uses the front matter of the Hugo places:

```ts
schema: z.object({
  title: z.string(),
  date: z.coerce.date(),
  lat: z.number(),
  lon: z.number(),
  country: z.string().optional(),
  placeName: z.string().optional(),
  placeLocation: z.string().optional(),
  placeAddress: z.string().optional(),
  appleMaps: z.string().optional(),
  openStreetMap: z.string().optional(),
  placeImages: z
    .array(z.object({
      src: z.string(),
      alt: z.string().optional(),
      caption: z.string().optional(),
    }))
    .default([]),
}),
```

### 7. Make URLs for posts and notes

AstroPaper makes post URLs in `src/utils/getPostPaths.ts`. The URLs always start with `posts/`. Add a `section` parameter so notes can use the same code:

```ts
export type ArticleSection = "posts" | "notes";

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
```

The function also uses the folders in the file path. For a page bundle, the folder is already the ID. Thus, remove the folder from the path:

```ts
const isBundle = /^index\.mdx?$/.test(segments[segments.length - 1] ?? "");

return segments
  .slice(0, isBundle ? -2 : -1)
  .map(segment => slugifyStr(segment));
```

Give the `section` parameter to `getPostSlug`, `Card.astro`, and `AdjacentPostNav.astro` too.

### 8. Render the Hugo shortcodes

Write a remark plugin in `src/utils/remarkHugoShortcodes.ts`. The plugin changes the shortcodes into HTML. Thus, the markdown files stay the same as in Hugo.

The plugin reads the markdown source of each paragraph. This is necessary because the GFM parser changes the URLs in a shortcode into links.

The plugin does these tasks:

- It changes `micro-social` into a link with the SVG icon in the line.
- It finds a `prompt` or `alert` paragraph, and the related closing paragraph. It puts the content between them into a `div` with the class `prompt-box` or `alert-box`.
- It changes `center-image` into a `figure`.
- It does not change shortcodes in code blocks or in inline code.

This is the part that makes a block container. Remark changes a node with `data.hName` into an HTML element:

```ts
function container(name: string, children: Node[]): Node {
  return {
    type: `hugo-${name}`,
    data: {
      hName: "div",
      hProperties: { className: [`${name}-box`] },
    },
    children,
  };
}
```

Register the plugin in `astro.config.ts`. Put it first, before the other remark plugins:

```ts
import remarkHugoShortcodes from "./src/utils/remarkHugoShortcodes";

export default defineConfig({
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkHugoShortcodes,
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
      ],
      rehypePlugins: [rehypeCallouts],
    }),
  },
});
```

Add the styles for `.micro-social`, `.prompt-box`, `.prompt-label`, `.alert-box`, and `.center-image` to `src/styles/global.css`.

> [!NOTE]
> A block shortcode must be in its own paragraph, with an empty line before and after it. The Hugo content uses this format.

### 9. Use one page layout for Blog and Notes

Move the body of `src/pages/posts/[...slug]/index.astro` into a component, `src/components/PostDetail.astro`. Move the `_components` folder to `src/components/post/`. The component gets the entry, the adjacent entries, and the section.

Write one function that makes the static paths for each section, in `src/utils/getArticlePaths.ts`:

```ts
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
      prevPost: adjacent(index + 1),
      nextPost: index > 0 ? adjacent(index - 1) : null,
    },
  }));
}
```

Then each detail page has only a few lines. This is `src/pages/notes/[...slug]/index.astro`:

```astro
---
import PostDetail, {
  type Props as PostDetailProps,
} from "@/components/PostDetail.astro";
import { getArticlePaths } from "@/utils/getArticlePaths";

export const getStaticPaths = () => getArticlePaths("notes");

type Props = PostDetailProps;
---

<PostDetail {...Astro.props} />
```

Make these pages for Notes too:

- `src/pages/notes/[...page].astro`: a copy of the posts list page that uses the `notes` collection.
- `src/pages/notes/[...slug]/index.png.ts`: the social image. It uses the `GET` function of the posts version again.

> [!NOTE]
> The tag pages show only blog posts. Thus, the note pages do not show tag links.

### 10. Change the navigation

Replace the Posts, Tags, and About links in `src/components/Header.astro` with a list:

```ts
const navItems = [
  { path: "posts", label: t.nav.posts },
  { path: "notes", label: t.nav.notes },
  { path: "micro", label: t.nav.micro },
  { path: "places", label: t.nav.places },
  { path: "about", label: t.nav.about },
];
```

Add the labels and page descriptions to `src/i18n/lang/en.ts` and `src/i18n/types.ts`. Change the label of `posts` to "Blog". Add the new sections to the labels in `src/components/Breadcrumb.astro`.

### 11. Make the Micro page

Make `src/components/MicroEntry.astro`. It shows the date and the full content of one micro post. The date is a link to the post on the page.

Make `src/pages/micro/[...page].astro`. It shows 20 micro posts on each page, with the newest post first. Use the `Pagination` component of AstroPaper.

### 12. Make the Places pages

Make `src/components/PlacesMap.astro`. This component shows a [Leaflet](https://leafletjs.com) map. It has two modes:

- `overview` shows all places in clusters, and colors the countries that have places.
- `single` shows one place.

The component loads Leaflet from unpkg when the page opens. AstroPaper uses view transitions, so the map starts on the `astro:page-load` event:

```ts
document.addEventListener("astro:page-load", initMaps);
```

Use OpenStreetMap tiles. These tiles do not need an API key:

```ts
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);
```

OpenStreetMap has no dark tiles. In dark mode, a CSS filter inverts the tiles:

```css
[data-theme="dark"] .places-map .leaflet-tile-pane {
  filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9);
}
```

The image paths in the Hugo places start with `/Blowfish/`, the base path of the old site. Remove this part when the page is built:

```ts
export function getPlaceImageSrc(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  return getAssetPath(src.replace(/^\/Blowfish(?=\/)/, ""));
}
```

Make two pages:

- `src/pages/places/index.astro`: the map, the five newest places, and all places in groups by country.
- `src/pages/places/[slug].astro`: the map of one place, the links to Apple Maps and OpenStreetMap, the text, and the photos.

### 13. Change the home page

Edit `src/pages/index.astro`. Show these items:

1. The photo, the name, the description, and the social links.
2. The two newest blog posts.
3. The two newest notes.
4. The five newest micro posts.

### 14. Show the brand icons correctly

The AstroPaper icons are outlines. The Font Awesome icons for Mastodon, Bluesky, and Micro.blog are filled shapes. AstroPaper gives all social icons a transparent fill, so these icons are not visible. Edit `src/components/Socials.astro`:

```ts
const filledIcons = new Set(["mastodon", "bluesky", "microblog"]);
```

Give the filled icons the class `fill-current`. Give the other icons the classes that AstroPaper uses.

### 15. Remove the template files

Remove the files of the AstroPaper project that the site does not use:

- `.github/`, `.vscode/`, `.prettierrc`, `.prettierignore`
- `.dockerignore`, `Dockerfile`, `compose.yaml`, `cz.yaml`
- `CHANGELOG.md`, `AstroPaper-lighthouse-score.svg`
- `src/assets/images/astropaper-og.jpg`
- The share icons that the site does not use, in `src/assets/icons/socials/`

Remove the `format` scripts and the Prettier packages from `package.json`. Keep `LICENSE`. AstroPaper uses the MIT license, and this license tells you to keep the notice.

## Commands

Run these commands in the site folder. They use the `astro` container machine.

Start the development server:

```sh
container machine run -n astro -- npm run dev -- --host 0.0.0.0 --force
```

Open `http://192.168.64.3:4321` in a browser. The IP address is the address of the machine. The command `container machine list` shows it.

Build the site into `dist/`. This command checks the types, builds the pages, and makes the search index:

```sh
container machine run -n astro -- npm run build
```

Show the built site:

```sh
container machine run -n astro -- npm run preview -- --host 0.0.0.0
```

Do a check of the code:

```sh
container machine run -n astro -- npm run lint
```

Install the dependencies again:

```sh
container machine run -n astro -- corepack pnpm install
```

## Problems and solutions

| Problem | Cause | Solution |
| --- | --- | --- |
| The map tiles show "API KEY REQUIRED". | CARTO tiles now need an API key. | Use OpenStreetMap tiles. |
| The development server does not show changes to files. | The mount of the container machine does not send file events. | Set polling in `astro.config.ts`. |
| The build stops with "The requested module 'cookie' does not provide an export named 'parse'". | pnpm keeps packages in `.pnpm/`. Node.js finds `cookie` 2.0.1 in `~/Developer/Astro/node_modules`. Astro needs version 1. | Set `nodeLinker: hoisted` in `pnpm-workspace.yaml`. Remove `node_modules` and install again. |
| The type check stops on the remark plugin. | The types of the plugin are not the same as the types of unified. | Use `this: unknown` and `tree: unknown`, and change the type in the function. |
| `ogImage` has no `src` property in the type check. | The schema function had a type that was not correct. | Use the `SchemaContext` type from `astro:content`. |
| Lint stops on `console.error`. | The ESLint rule `no-console` is on. | Put `// eslint-disable-next-line no-console` before each log of an error. |

This is the polling setting in `astro.config.ts`:

```ts
vite: {
  plugins: [tailwindcss()],
  // The container machine's home mount sends no file events, so poll.
  server: { watch: { usePolling: true, interval: 300 } },
},
```

## Result

The build makes 33 pages. The search index has the blog posts, the notes, the micro posts, and the places.

| Section | URL |
| --- | --- |
| Home | `/` |
| Blog | `/posts` |
| Notes | `/notes` |
| Micro | `/micro` |
| Places | `/places` |
| About | `/about` |

To add content, put a markdown file in the folder of the section. Use the same front matter as in Hugo.

---

Converted by Claude Opus 5.5 Medium
