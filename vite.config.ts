import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    publicDir: "public",
    build: {
        rollupOptions: {
            input: [
                "index.html",
                "collection.html",
                "games.html",
                "game-page.html",
            ],
        },
    },
});
