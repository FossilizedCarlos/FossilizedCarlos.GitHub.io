/**
 * Renders the Hugo shortcodes used by the Blowfish site, so its markdown
 * files can be copied in unchanged:
 *
 * - `{{< micro-social mastodon "https://..." >}}`  inline syndication link
 * - `{{< prompt >}} ... {{< /prompt >}}`           LLM prompt box
 * - `{{< alert "icon" >}} ... {{< /alert >}}`       note box
 * - `{{< center-image src="..." width="50%" >}}`    centred image
 *
 * Block shortcodes must sit in their own paragraph (blank lines around them),
 * which is how they are written in Hugo.
 */
import fs from "node:fs";
import path from "node:path";

type Node = {
  type: string;
  value?: string;
  children?: Node[];
  position?: { start: { offset?: number }; end: { offset?: number } };
  data?: Record<string, unknown>;
};

const SHORTCODE = /\{\{<\s*(\/?[\w-]+)((?:\s+(?:[\w-]+=)?(?:"[^"]*"|[^\s">]+))*)\s*>\}\}/g;
const ARG = /(?:([\w-]+)=)?(?:"([^"]*)"|([^\s"]+))/g;

const SOCIAL_LABELS: Record<string, string> = {
  microblog: "Micro.blog",
  mastodon: "Mastodon",
  bluesky: "Bluesky",
};

const ICON_DIR = path.resolve("src/assets/icons/socials");
const iconCache = new Map<string, string>();

function readIcon(name: string): string {
  if (!iconCache.has(name)) {
    let svg = "";
    try {
      svg = fs
        .readFileSync(path.join(ICON_DIR, `${name}.svg`), "utf8")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<svg\b/, '<svg aria-hidden="true" focusable="false"')
        .trim();
    } catch {
      svg = "";
    }
    iconCache.set(name, svg);
  }
  return iconCache.get(name) ?? "";
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function parseArgs(raw: string) {
  const positional: string[] = [];
  const named: Record<string, string> = {};
  for (const match of raw.matchAll(ARG)) {
    const value = match[2] ?? match[3] ?? "";
    if (match[1]) named[match[1]] = value;
    else positional.push(value);
  }
  return { positional, named };
}

function microSocial(args: string[]): string {
  const [name = "", url = ""] = args;
  const label = SOCIAL_LABELS[name] ?? name;
  return (
    `<a class="micro-social" href="${escapeHtml(url)}" target="_blank" rel="me noopener" ` +
    `title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">` +
    `${readIcon(name)}<span class="sr-only">${escapeHtml(label)}</span></a>`
  );
}

function centerImage(named: Record<string, string>): string {
  const width = named.width ?? "100%";
  const title = named.title ? ` title="${escapeHtml(named.title)}"` : "";
  return (
    `<figure class="center-image"><img src="${escapeHtml(named.src ?? "")}" ` +
    `alt="${escapeHtml(named.alt ?? "")}"${title} style="width:${escapeHtml(width)}" loading="lazy" /></figure>`
  );
}

/** Raw markdown source of a node, or "" when positions are unavailable. */
function sourceOf(node: Node, source: string): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined
    ? ""
    : source.slice(start, end);
}

function blockMarker(node: Node, source: string) {
  if (node.type !== "paragraph") return null;
  const raw = sourceOf(node, source).trim();
  const match = /^\{\{<\s*(\/?)(prompt|alert)\b([^>]*)>\}\}$/.exec(raw);
  return match
    ? { closing: match[1] === "/", name: match[2], args: match[3] }
    : null;
}

function container(name: string, children: Node[]): Node {
  const label: Node[] =
    name === "prompt"
      ? [
          {
            type: "paragraph",
            data: { hProperties: { className: ["prompt-label"] } },
            children: [{ type: "text", value: "Prompt" }],
          },
        ]
      : [];
  return {
    type: `hugo-${name}`,
    data: {
      hName: "div",
      hProperties: { className: [`${name}-box`] },
    },
    children: [...label, ...children],
  };
}

export default function remarkHugoShortcodes(this: unknown) {
  const processor = this as { parse?: (doc: string) => Node };

  const parseInline = (markdown: string): Node[] => {
    if (!markdown.trim()) return [];
    const root = processor.parse?.(markdown);
    const first = root?.children?.[0];
    if (first?.type === "paragraph" && first.children) return first.children;
    return [{ type: "text", value: markdown }];
  };

  /** Replace inline shortcodes inside one paragraph. */
  const rewriteParagraph = (node: Node, source: string): Node => {
    const raw = sourceOf(node, source);
    if (!raw.includes("{{<")) return node;

    const trimmed = raw.trim();
    const whole = /^\{\{<\s*center-image\b([\s\S]*?)>\}\}$/.exec(trimmed);
    if (whole) {
      return { type: "html", value: centerImage(parseArgs(whole[1]).named) };
    }

    const children: Node[] = [];
    let last = 0;
    for (const match of raw.matchAll(SHORTCODE)) {
      const [text, name, rawArgs] = match;
      const { positional, named } = parseArgs(rawArgs);
      let html: string | null = null;
      if (name === "micro-social") html = microSocial(positional);
      if (name === "center-image") html = centerImage(named);
      if (html === null) continue;

      children.push(...parseInline(raw.slice(last, match.index)));
      children.push({ type: "html", value: html });
      last = (match.index ?? 0) + text.length;
    }
    if (last === 0) return node;
    children.push(...parseInline(raw.slice(last)));
    return { ...node, children };
  };

  const walk = (parent: Node, source: string) => {
    const input = parent.children;
    if (!input) return;

    const output: Node[] = [];
    for (let i = 0; i < input.length; i++) {
      const node = input[i];
      const marker = blockMarker(node, source);

      if (marker && !marker.closing) {
        const end = input.findIndex(
          (candidate, j) =>
            j > i &&
            blockMarker(candidate, source)?.closing &&
            blockMarker(candidate, source)?.name === marker.name
        );
        if (end !== -1) {
          const inner: Node = { type: "root", children: input.slice(i + 1, end) };
          walk(inner, source);
          output.push(container(marker.name, inner.children ?? []));
          i = end;
          continue;
        }
      }

      if (node.type === "paragraph") {
        output.push(rewriteParagraph(node, source));
      } else {
        walk(node, source);
        output.push(node);
      }
    }
    parent.children = output;
  };

  return (tree: unknown, file: { value?: unknown }) => {
    const source = String(file.value ?? "");
    if (!source.includes("{{<")) return;
    walk(tree as Node, source);
  };
}
