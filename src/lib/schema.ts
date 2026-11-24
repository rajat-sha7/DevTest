import { SITE, abs } from "@/lib/site";

/**
 * schema.org builders. Every node gets a stable `@id` so pages can reference
 * the site-wide Organization / WebSite nodes (emitted once in the root layout)
 * instead of repeating them.
 */

type Node = Record<string, unknown>;

export const ids = {
  organization: abs("/#organization"),
  website: abs("/#website"),
  logo: abs("/#logo"),
  page: (path: string) => `${abs(path)}#webpage`,
  breadcrumb: (path: string) => `${abs(path)}#breadcrumb`,
};

const ref = (id: string) => ({ "@id": id });

export const ogImage = (): Node => ({
  "@type": "ImageObject",
  url: abs("/opengraph-image"),
  width: 1200,
  height: 630,
  caption: `${SITE.name} - ${SITE.tagline}`,
});

const FREE_OFFER: Node = { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" };

export const freeOffer = () => ({ ...FREE_OFFER });

export function organization(): Node {
  return {
    "@type": "Organization",
    "@id": ids.organization,
    name: SITE.name,
    url: abs("/"),
    description: SITE.description,
    logo: { "@type": "ImageObject", "@id": ids.logo, url: abs("/apple-icon"), width: 180, height: 180, caption: SITE.name },
    image: ref(ids.logo),
  };
}

export function website(): Node {
  return {
    "@type": "WebSite",
    "@id": ids.website,
    url: abs("/"),
    name: SITE.name,
    alternateName: SITE.title,
    description: SITE.description,
    inLanguage: "en",
    publisher: ref(ids.organization),
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumb(path: string, trail: Crumb[]): Node {
  const items = [{ name: "Home", path: "/" }, ...trail];
  return {
    "@type": "BreadcrumbList",
    "@id": ids.breadcrumb(path),
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.path) })),
  };
}

export function webPage(opts: {
  path: string;
  name: string;
  description: string;
  type?: "WebPage" | "CollectionPage" | "AboutPage";
  breadcrumb?: boolean;
  about?: string[];
  mainEntity?: string;
}): Node {
  const { path, name, description, type = "WebPage", about, mainEntity } = opts;
  return {
    "@type": type,
    "@id": ids.page(path),
    url: abs(path),
    name,
    description,
    inLanguage: "en",
    isPartOf: ref(ids.website),
    publisher: ref(ids.organization),
    primaryImageOfPage: ogImage(),
    ...(opts.breadcrumb === false ? {} : { breadcrumb: ref(ids.breadcrumb(path)) }),
    ...(about?.length ? { about: about.map((a) => ({ "@type": "Thing", name: a })) } : {}),
    ...(mainEntity ? { mainEntity: ref(mainEntity) } : {}),
  };
}

export const graph = (...nodes: Node[]) => ({ "@context": "https://schema.org", "@graph": nodes });
