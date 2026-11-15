import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs, socialMeta } from "@/lib/site";

const title = "Documentation";
const description =
  "Visual documentation for React, Next.js, JavaScript and HTML/CSS topics.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/docbar" },
  ...socialMeta(`${title} | ${SITE.name}`, description, "/docbar"),
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
              "@id": abs("/docbar"),
              url: abs("/docbar"),
              name: title,
              description,
              isPartOf: { "@id": abs("/#website") },
              inLanguage: "en",
            },
            {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE.name, item: abs("/") },
          { "@type": "ListItem", position: 2, name: "Documentation", item: abs("/docbar") },
        ],
      },
          ],
        }}
      />
      {children}
    </>
  );
}
