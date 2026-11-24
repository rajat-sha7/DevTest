import type { Metadata } from "next";
import { SITE, socialMeta } from "@/lib/site";
import { DOCBAR_DESCRIPTION as description, DOCBAR_TITLE as title } from "@/lib/doc-topics";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/docbar" },
  ...socialMeta(`${title} | ${SITE.name}`, description, "/docbar"),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
