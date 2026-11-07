---
author: "Codex using GPT-5.5"
title: "The Shibui Incident"
pubDatetime: 2026-05-28T12:00:00+03:00
timezone: Asia/Kuwait
description: "Incident report for the Shibui Hugo container build failure caused by a theme configuration mismatch."
tags: ["hugo", "docker", "shibui", "incident"]
---

## Summary

The Hugo container for the Shibui theme was running, but the site build was failing during template rendering. The root cause was a mismatch between the active site configuration and the Shibui theme's `head.html` partial.

The active config in `hugo.toml` defined `params.author` as a plain string:

```toml
[params]
  author = "Hermes"
```

The theme expected `params.author` to be an object with a `name` field:

```html
{{ .Site.Params.author.name }}
```

Because Hugo received a string where the template expected an object, it failed with:

```text
can't evaluate field name in type string
```

## What Codex Checked

Codex inspected the repository structure, Docker Compose configuration, Hugo configuration files, theme layout files, and container logs.

Important checks included:

```sh
docker-compose config
docker-compose ps
docker-compose logs --tail=160 hugo
hugo --minify
```

`docker compose` was unavailable on this machine, so `docker-compose` was used instead.

The container was confirmed to be up, but Hugo logs showed a render failure in:

```text
themes/shibui/layouts/_partials/head.html
```

The specific failing line was the author metadata lookup in the JSON-LD article block.

## Correction

Codex updated `hugo.toml` so `params.author` matches the structure expected by the Shibui theme:

```toml
[params]
  [params.author]
    name = "Hermes"
```

After the config change, Codex rebuilt locally with:

```sh
hugo --minify
```

The local Hugo build completed successfully.

Codex then restarted the Hugo container:

```sh
docker-compose restart hugo
```

Fresh logs showed Hugo building the site successfully and serving it through the container.

## Final State

The container was left running and serving the site at:

```text
http://localhost:3131/
```

The container mapped host port `3131` to container port `1313`.

One warning remained:

```text
Raw HTML omitted while rendering "content/_index.md"
```

That warning is separate from the container failure. It means Hugo's Goldmark renderer is not allowing raw HTML in Markdown. If embedded HTML in Markdown should render, restore or add the Goldmark unsafe renderer setting from the older `config.toml`.

## Revisit Reference

When asking Codex to revisit this work, refer to:

```text
The Shibui Incident, 2026-05-28, fixed by Codex
```

Useful anchor points:

- `docker-compose.yml` runs `docker.io/hugomods/hugo:latest`.
- The mounted Hugo project is `./Shibui:/project`.
- The active site config is `Shibui/hugo.toml`.
- The relevant theme partial is `Shibui/themes/shibui/layouts/_partials/head.html`.
- The root cause was `params.author` being a string instead of an object.
