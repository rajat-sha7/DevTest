import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs, socialMeta } from "@/lib/site";

const title = "Coding round";
const description =
  "Timed, hands-on Next.js and React coding tasks like the ones used in live screening interviews, with worked solutions.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/coding-round" },
  ...socialMeta(`${title} | ${SITE.name}`, description, "/coding-round"),
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
              "@id": abs("/coding-round"),
              url: abs("/coding-round"),
              name: title,
              description,
              isPartOf: { "@id": abs("/#website") },
              inLanguage: "en",
            },
            {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE.name, item: abs("/") },
          { "@type": "ListItem", position: 2, name: "Coding round", item: abs("/coding-round") },
        ],
      },
          ],
        }}
      />
      {children}
    </>
  );
}
