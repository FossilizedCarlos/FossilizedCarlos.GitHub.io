/**
 * Credits a borrowed image. When an image's title is a URL, the image is
 * wrapped in a figure with a caption that links back to that source:
 *
 *   ![MSI M.2 Xpander-AERO](@/assets/posts/slug/xpander.jpg "https://...")
 *
 * The caption shows "Source: <site>". The image keeps click to enlarge,
 * because it is not inside the link.
 */
type Node = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const URL_PATTERN = /^https?:\/\/\S+$/;

const isWhitespace = (node: Node) =>
  node.type === "text" && !node.value?.trim();

function sourceUrl(node: Node): string | undefined {
  if (node.type !== "element" || node.tagName !== "img") return undefined;
  const title = node.properties?.title;
  return typeof title === "string" && URL_PATTERN.test(title)
    ? title
    : undefined;
}

function figure(image: Node, url: string): Node {
  const { title: _title, ...properties } = image.properties ?? {};
  const site = new URL(url).hostname.replace(/^www\./, "");
  return {
    type: "element",
    tagName: "figure",
    properties: { className: ["image-source"] },
    children: [
      { ...image, properties },
      {
        type: "element",
        tagName: "figcaption",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "a",
            properties: { href: url, target: "_blank", rel: ["noopener"] },
            children: [{ type: "text", value: `Source: ${site}` }],
          },
        ],
      },
    ],
  };
}

function transform(parent: Node) {
  const children = parent.children;
  if (!children) return;

  children.forEach((child, index) => {
    // A Markdown image is the only thing in its paragraph: the figure
    // replaces the paragraph, since a figure can't sit inside a <p>.
    if (child.type === "element" && child.tagName === "p") {
      const content = (child.children ?? []).filter(c => !isWhitespace(c));
      const url = content.length === 1 ? sourceUrl(content[0]) : undefined;
      if (url) {
        children[index] = figure(content[0], url);
        return;
      }
    }
    // Images inside links already go somewhere else on click.
    if (child.type === "element" && child.tagName === "a") return;
    transform(child);
  });
}

export default function rehypeImageSource() {
  return (tree: Node) => transform(tree);
}
