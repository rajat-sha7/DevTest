import { ImageResponse } from "next/og";
import { ShareImage } from "@/lib/brand-image";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} - ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<ShareImage title="Crack the frontend interview." />, size);
}
