import { ImageResponse } from "next/og";
import { AppleIconImage } from "@/lib/brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppleIconImage />, size);
}
