import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs, socialMeta } from "@/lib/site";

const title = "Playground";
const description =
  "Run JavaScript, TypeScript and HTML/CSS in your browser. Live preview, shareable links, and test-checked coding challenges with no setup.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/playground" },
  ...socialMeta(`${title} | ${SITE.name}`, description, "/playground"),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": abs("/playground"),
              url: abs("/playground"),
              name: title,
              description,
              isPartOf: { "@id": abs("/#website") },
              inLanguage: "en",
            },
            {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE.name, item: abs("/") },
          { "@type": "ListItem", position: 2, name: "Playground", item: abs("/playground") },
        ],
      },
            {
              "@type": "WebApplication",
              name: "DevQnA Playground",
              url: abs("/playground"),
              description,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Any",
              browserRequirements: "Requires JavaScript",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              publisher: { "@id": abs("/#organization") },
            },
          ],
        }}
      />
      {children}
    </>
  );
}
