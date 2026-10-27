import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://www.carlosbarboza.me/",
    title: "Carlos E. Barboza",
    description:
      "Engineer, iOS Developer, Tri Age Grouper, and Cappuccino explorer.",
    author: "Carlos E. Barboza",
    profile: "https://www.carlosbarboza.me/",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "America/Chicago",
    dir: "ltr",
  },
  posts: {
    perPage: 10,
    perIndex: 2,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: false,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [
    { name: "mastodon",  url: "https://mastodon.social/@FossilzedCarlos" },
    { name: "bluesky",   url: "https://bsky.app/profile/fossilizedcarlos.bsky.social" },
    { name: "microblog", url: "https://micro.blog/fossilizedcarlos", linkTitle: "Carlos E. Barboza on Micro.blog" },
    { name: "github",    url: "https://github.com/FossilizedCarlos" },
    { name: "linkedin",  url: "https://linkedin.com/in/cebarboza" },
  ],
  shareLinks: [],
});
