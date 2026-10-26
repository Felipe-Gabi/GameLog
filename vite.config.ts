import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                collection: resolve(__dirname, "collection.html"),
                games: resolve(__dirname, "games.html"),
                gamePage: resolve(__dirname, "game-page.html"),
            },
        },
    },
});
