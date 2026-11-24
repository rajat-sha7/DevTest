import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE, abs, socialMeta } from "@/lib/site";
import { breadcrumb, graph, ids, webPage } from "@/lib/schema";
import { docData } from "@/app/docData";
import { DOC_TOPIC_LABELS } from "@/lib/doc-topics";

type Params = { params: Promise<{ topic: string }> };

function resolve(raw: string) {
  const topic = decodeURIComponent(raw).slice(0, 40);
  const known = topic in docData;
  const name = DOC_TOPIC_LABELS[topic] ?? topic.charAt(0).toUpperCase() + topic.slice(1);
  return {
    known,
    name,
    title: `${name} documentation`,
    description: `Visual ${name} documentation for frontend interview preparation.`,
    path: `/docbar/${encodeURIComponent(topic)}`,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { known, title, description, path } = resolve((await params).topic);
  return {
    title: { absolute: `${title} | ${SITE.name}` },
    description,
    alternates: { canonical: path },
    ...(known ? {} : { robots: { index: false, follow: true } }),
    ...socialMeta(`${title} | ${SITE.name}`, description, path, "article"),
  };
}

export default async function Layout({ children, params }: Params & { children: React.ReactNode }) {
  const { known, name, title, description, path } = resolve((await params).topic);
  if (!known) return children;

  const schema = graph(
    webPage({ path, name: title, description, about: [name], mainEntity: `${abs(path)}#article` }),
    breadcrumb(path, [
      { name: "Documentation", path: "/docbar" },
      { name: title, path },
    ]),
    {
      "@type": "TechArticle",
      "@id": `${abs(path)}#article`,
      headline: title,
      description,
      url: abs(path),
      about: { "@type": "Thing", name },
      proficiencyLevel: "Beginner",
      inLanguage: "en",
      isAccessibleForFree: true,
      image: docData[(await params).topic]?.slice(0, 3),
      author: { "@id": ids.organization },
      publisher: { "@id": ids.organization },
      isPartOf: { "@id": ids.website },
    }
  );

  return (
    <>
      <JsonLd data={schema} />
      {children}
    </>
  );
}
