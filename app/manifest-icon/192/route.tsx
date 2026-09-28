import { ImageResponse } from "next/og";
import { HouseIcon } from "@/app/icon-shared";

const size = { width: 192, height: 192 };

export async function GET() {
  return new ImageResponse(<HouseIcon size={size.width} />, size);
}
