import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs, socialMeta } from "@/lib/site";
import { breadcrumb, freeOffer, graph, ids, ogImage, webPage } from "@/lib/schema";

const title = "Playground";
const seoTitle = "Online JavaScript, TypeScript & HTML Playground";
const description =
  "Run JavaScript, TypeScript and HTML/CSS in your browser. Live preview, shareable links and test-checked coding challenges. No setup, no account.";
const keywords = ["javascript playground", "typescript playground", "online code editor", "html css playground", "run javascript online", "javascript coding challenges"];

export const metadata: Metadata = {
  title: seoTitle,
  description,
  keywords,
  alternates: { canonical: "/playground" },
  ...socialMeta(`${seoTitle} | ${SITE.name}`, description, "/playground"),
};

const PATH = "/playground";
const appId = `${abs(PATH)}#app`;

const schema = graph(
  webPage({ path: PATH, name: seoTitle, description, mainEntity: appId, about: ["JavaScript", "TypeScript", "HTML", "CSS"] }),
  breadcrumb(PATH, [{ name: title, path: PATH }]),
  {
    "@type": "WebApplication",
    "@id": appId,
    name: `${SITE.name} Playground`,
    url: abs(PATH),
    description,
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Online code editor",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript. Works in any modern browser.",
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: freeOffer(),
    image: ogImage(),
    featureList: [
      "Run JavaScript and TypeScript in the browser",
      "HTML/CSS editor with live preview",
      "Shareable links",
      "Test-checked coding challenges",
      "No setup or account needed",
    ],
    isPartOf: { "@id": ids.website },
    publisher: { "@id": ids.organization },
  }
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={schema} />
      {children}
    </>
  );
}
