import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spotlab",
    short_name: "Spotlab",
    description: "Spotlab — une alternative libre et gratuite à Spotify.",
    start_url: "/",
    display: "standalone",
    background_color: "#060608",
    theme_color: "#060608",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
