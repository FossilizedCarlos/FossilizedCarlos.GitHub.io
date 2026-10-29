import type { UIStrings } from "../types";

export default {
  nav: {
    home: "Home",
    posts: "Blog",
    notes: "Notes",
    micro: "Micro",
    places: "Places",
    tags: "Tags",
    about: "About",
    archives: "Archives",
    search: "Search",
  },
  post: {
    publishedAt: "Published at",
    updatedAt: "Updated",
    sharePostIntro: "Share this post:",
    sharePostOn: "Share this post on {{platform}}",
    sharePostViaEmail: "Share this post via email",
    tagLabel: "Tags",
    backToTop: "Back to top",
    goBack: "Go back",
    editPage: "Edit page",
    previousPost: "Previous Post",
    nextPost: "Next Post",
  },
  pagination: {
    prev: "Prev",
    next: "Next",
    page: "Page",
  },
  home: {
    socialLinks: "Social Links",
    featured: "Featured",
    recentPosts: "Latest Blog Posts",
    recentNotes: "Latest Notes",
    recentMicro: "Latest Micro Posts",
    allPosts: "All Blog Posts",
    allNotes: "All Notes",
    allMicro: "All Micro Posts",
  },
  footer: {
    copyright: "Copyright",
    allRightsReserved: "All rights reserved.",
  },
  pages: {
    tagTitle: "Tag",
    tagDesc: "All the articles with the tag",

    tagsTitle: "Tags",
    tagsDesc: "All the tags used in posts.",

    postsTitle: "Blog",
    postsDesc:
      "Blog posts are mostly static. I publish them and rarely update. If done right, they should be helpful to others, but results might vary.",

    notesTitle: "Notes",
    notesDesc:
      "Notes are likely to change as I learn more, and might not be all that helpful. There might be value in them, but treat them like an unfinished manuscript.",

    microTitle: "Micro",
    microDesc:
      "All Micro Posts are syndicated to Mastodon, Micro.blog, and Bluesky.",

    placesTitle: "Places",
    placesDesc:
      "A map of places I've been and liked, or would like to visit some day.",

    archivesTitle: "Archives",
    archivesDesc: "All the articles I've archived.",

    searchTitle: "Search",
    searchDesc: "Search any article ...",
  },
  a11y: {
    skipToContent: "Skip to content",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    toggleTheme: "Toggle theme",
    searchPlaceholder: "Search posts and notes...",
    noResults: "No results found",
    goToPreviousPage: "Go to previous page",
    goToNextPage: "Go to next page",
  },
  notFound: {
    title: "404 Not Found",
    message: "Page Not Found",
    goHome: "Go back home",
  },
} satisfies UIStrings;
