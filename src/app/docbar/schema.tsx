import { JsonLd } from "@/components/JsonLd";
import { SITE, abs } from "@/lib/site";
import { breadcrumb, graph, webPage } from "@/lib/schema";
import { docData } from "@/app/docData";
import { DOC_TOPIC_LABELS, DOCBAR_DESCRIPTION as description, DOCBAR_TITLE as title } from "@/lib/doc-topics";

const PATH = "/docbar";

const schema = graph(
  webPage({ path: PATH, name: title, description, type: "CollectionPage", about: Object.values(DOC_TOPIC_LABELS) }),
  breadcrumb(PATH, [{ name: title, path: PATH }]),
  {
    "@type": "ItemList",
    "@id": `${abs(PATH)}#topics`,
    name: `${SITE.name} documentation topics`,
    itemListElement: Object.keys(docData).map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${DOC_TOPIC_LABELS[t] ?? t} documentation`,
      url: abs(`${PATH}/${encodeURIComponent(t)}`),
    })),
  }
);

export function DocbarSchema() {
  return <JsonLd data={schema} />;
}
