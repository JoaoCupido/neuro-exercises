import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";

const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
    vite: {
        plugins: [tailwindcss()],
        optimizeDeps: {
            exclude: ['onnxruntime-web'],
        }
    },
    build: {
        assetsDir: '_astro',
    },
    site: 'https://joaocupido.github.io/neuro-exercises/',
    base: '/',
});
