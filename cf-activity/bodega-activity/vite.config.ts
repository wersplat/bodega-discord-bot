import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()], 
  server: { 
    allowedHosts: ["surge-sphere-dpi-name.trycloudflare.com"],
    cors: {
      origin: process.env.VITE_ALLOWED_ORIGINS
        ? process.env.VITE_ALLOWED_ORIGINS.split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
        : true, 
      credentials: true,
      allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
      ],
      exposedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
      ],
      maxAge: 3600,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }
  }
});
