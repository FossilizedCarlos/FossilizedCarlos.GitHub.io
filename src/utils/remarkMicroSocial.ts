/**
 * Renders the Hugo `micro-social` shortcode that the micro post app still
 * writes, as an inline syndication link:
 *
 *   {{< micro-social mastodon "https://..." >}}
 *
 * Remove this plugin once the app writes the links another way.
 */
type Node = {
  type: string;
  value?: string;
  children?: Node[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};

const SHORTCODE = /\{\{<\s*micro-social((?:\s+(?:"[^"]*"|[^\s">]+))*)\s*>\}\}/g;
const ARG = /"([^"]*)"|([^\s"]+)/g;

const SOCIAL_LABELS: Record<string, string> = {
  microblog: "Micro.blog",
  mastodon: "Mastodon",
  bluesky: "Bluesky",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function microSocial(rawArgs: string): string {
  const [name = "", url = ""] = [...rawArgs.matchAll(ARG)].map(
    match => match[1] ?? match[2] ?? ""
  );
  const label = SOCIAL_LABELS[name] ?? name;
  return (
    `<a class="micro-social" href="${escapeHtml(url)}" target="_blank" rel="me noopener" ` +
    `title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">` +
    // The icon itself is drawn by CSS from src/assets/icons/socials/, so a new
    // icon file shows up without re-rendering the cached markdown.
    `<span class="micro-social-icon" data-icon="${escapeHtml(name)}" aria-hidden="true"></span>` +
    `<span class="sr-only">${escapeHtml(label)}</span></a>`
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

export default function remarkMicroSocial(this: unknown) {
  const processor = this as { parse?: (doc: string) => Node };

  const parseInline = (markdown: string): Node[] => {
    if (!markdown.trim()) return [];
    const root = processor.parse?.(markdown);
    const first = root?.children?.[0];
    if (first?.type === "paragraph" && first.children) return first.children;
    return [{ type: "text", value: markdown }];
  };

  /** Replace the shortcodes inside one paragraph. */
  const rewriteParagraph = (node: Node, source: string): Node => {
    const raw = sourceOf(node, source);
    if (!raw.includes("{{<")) return node;

    // Shortcodes written inside `inline code` are examples, not shortcodes.
    const start = node.position?.start.offset ?? 0;
    const codeRanges = (node.children ?? [])
      .filter(child => child.type === "inlineCode")
      .map(child => [
        (child.position?.start.offset ?? 0) - start,
        (child.position?.end.offset ?? 0) - start,
      ]);
    const inCode = (index: number) =>
      codeRanges.some(([from, to]) => index >= from && index < to);

    const children: Node[] = [];
    let last = 0;
    for (const match of raw.matchAll(SHORTCODE)) {
      if (inCode(match.index ?? 0)) continue;
      children.push(...parseInline(raw.slice(last, match.index)));
      children.push({ type: "html", value: microSocial(match[1]) });
      last = (match.index ?? 0) + match[0].length;
    }
    if (last === 0) return node;
    children.push(...parseInline(raw.slice(last)));
    return { ...node, children };
  };

  const walk = (parent: Node, source: string) => {
    if (!parent.children) return;
    parent.children = parent.children.map(node => {
      if (node.type === "paragraph") return rewriteParagraph(node, source);
      walk(node, source);
      return node;
    });
  };

  return (tree: unknown, file: { value?: unknown }) => {
    const source = String(file.value ?? "");
    if (!source.includes("{{<")) return;
    walk(tree as Node, source);
  };
}
