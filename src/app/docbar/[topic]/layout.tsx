import type { Metadata } from "next";
import { SITE, socialMeta } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic: raw } = await params;
  const topic = decodeURIComponent(raw).slice(0, 40);
  const name = topic.charAt(0).toUpperCase() + topic.slice(1);
  const title = `${name} documentation`;
  const description = `Visual ${name} documentation for frontend interview preparation.`;
  const path = `/docbar/${encodeURIComponent(topic)}`;
  return {
    title: { absolute: `${title} | ${SITE.name}` },
    description,
    alternates: { canonical: path },
    ...socialMeta(`${title} | ${SITE.name}`, description, path, "article"),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
