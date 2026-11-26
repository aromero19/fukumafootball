import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fukuma Family Football",
    short_name: "Fukuma FF",
    description: "The home of the Fukuma family NFL pick'em league",
    start_url: "/picks",
    display: "standalone",
    background_color: "#0b2545",
    theme_color: "#0b2545",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
