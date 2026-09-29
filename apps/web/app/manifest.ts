import type { MetadataRoute } from "next";

/** Minimal installable web app shell for Agora "mobile app" narrative. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Metrix AI",
    short_name: "Metrix",
    description:
      "Autonomous trading agent on Monad — Kuru spot, auditable decisions, Mera passkey funding.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e17",
    theme_color: "#0a0e17",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
