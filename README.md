# Astro Blowfish

Carlos E. Barboza's site, ported from the Hugo [Blowfish](https://www.carlosbarboza.me/Blowfish/) version to [Astro](https://astro.build) with the [AstroPaper](https://github.com/satnaing/astro-paper) theme.

## Sections

| Section | Content folder         | URL       |
| ------- | ---------------------- | --------- |
| Blog    | `src/content/posts/`   | `/posts`  |
| Notes   | `src/content/notes/`   | `/notes`  |
| Micro   | `src/content/micro/`   | `/micro`  |
| Places  | `src/content/places/`  | `/places` |
| About   | `src/content/pages/about.md` | `/about` |

Posts and notes are single files (`my-post.md`) with `pubDatetime`, `description` and `tags` in the front matter; the file name is the URL slug. Micro and places use `date`. Posts that need a component are `.mdx` files: the LLM prompt boxes use `src/components/Prompt.astro`, and images use Astro's `<Image>`. Micro posts still use the Hugo `micro-social` shortcode, because the app that writes them does; `src/utils/remarkMicroSocial.ts` renders it.

Site settings (title, socials, posts per page) are in `astro-paper.config.ts`.

## Commands

Run these from this folder. They use the `astro` container machine, so nothing is installed on macOS. pnpm is in `~/.local/bin` in the machine, so each command loads `~/.profile` first. In a shell inside the machine, run `. ~/.profile` once, then use the `pnpm` commands directly.

Start the dev server at http://192.168.64.4:4321 (`container machine list` shows the machine's IP):

```sh
container machine run -n astro -- sh -c '. ~/.profile && pnpm dev --host --force'
```

Build the site to `dist/` (type check, build, search index):

```sh
container machine run -n astro -- sh -c '. ~/.profile && pnpm build'
```

Preview the build:

```sh
container machine run -n astro -- sh -c '. ~/.profile && pnpm preview --host'
```

Install dependencies:

```sh
container machine run -n astro -- sh -c '. ~/.profile && pnpm install'
```

## Notes

- Packages are hard links to the shared pnpm store at `~/.pnpm-store`, which Fossilized Bits also uses. The machine's pnpm config sets `store-dir` to it. If a `node_modules/.pnpm-store` folder ever appears, pnpm made a second store: remove `node_modules` and run `pnpm install` again.
- `pnpm-workspace.yaml` sets `nodeLinker: hoisted`, a flat `node_modules`. It was added when `~/Developer/Astro` had a shared npm `node_modules`; that folder is gone now.
- `astro.config.ts` polls for file changes, because the container machine's home mount sends no file events.
- The Places maps load Leaflet from unpkg and use OpenStreetMap tiles.

## License

Theme: AstroPaper by Sat Naing, MIT (see `LICENSE`).
