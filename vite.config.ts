import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Use a host value that listens on all IPv4 interfaces.
    // Using IPv6-only `"::"` can cause the dev server HMR websocket
    // to be unreachable from browsers that resolve `localhost` to IPv4.
    // `true` tells Vite to listen on all addresses (IPv4+IPv6) and
    // avoids IPv6-only binding issues on some systems.
    host: true,
    port: 5173,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
