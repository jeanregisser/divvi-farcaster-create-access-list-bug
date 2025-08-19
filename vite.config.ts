import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/divvi-farcaster-create-access-list-bug/",
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
});
