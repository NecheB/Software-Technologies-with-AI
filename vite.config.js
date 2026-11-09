import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        [
          "index",
          "directory",
          "business",
          "signin",
          "register",
          "account",
          "owner",
          "editor",
          "community",
          "topic",
          "advertising",
          "moderation",
          "users",
          "taxonomy",
          "settings",
          "audit",
          "reset",
        ].map((name) => [name, resolve(import.meta.dirname, `${name}.html`)]),
      ),
    },
  },
});
