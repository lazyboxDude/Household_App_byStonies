import { ImageResponse } from "next/og";
import { HouseIcon } from "@/app/icon-shared";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<HouseIcon size={size.width} />, size);
}
