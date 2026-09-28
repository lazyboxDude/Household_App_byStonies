import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Our Home Base",
    short_name: "Home Base",
    description: "A collaborative household management app for couples",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#ea580c",
    icons: [
      {
        src: "/manifest-icon/192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/manifest-icon/512",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
