import { ImageResponse } from "next/og";
import { HouseIcon } from "@/app/icon-shared";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<HouseIcon size={size.width} />, size);
}
