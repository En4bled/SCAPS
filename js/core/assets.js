import { getAssetPath } from './constants.js';

class AssetManager {
    constructor() {
        this.images = new Map();
        this.sounds = new Map();
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.onProgress = null;
    }

    async preloadImage(path) {
        const absolutePath = getAssetPath(path);
        if (this.images.has(absolutePath)) {
            return this.images.get(absolutePath);
        }

        this.totalAssets++;
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.loadedAssets++;
                if (this.onProgress) {
                    this.onProgress(this.loadedAssets, this.totalAssets, path);
                }
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Error al precargar imagen: ${path}`);
                this.loadedAssets++;
                if (this.onProgress) {
                    this.onProgress(this.loadedAssets, this.totalAssets, path);
                }
                resolve(img); // Resolver de todos modos para no bloquear el juego
            };
            img.src = absolutePath;
            this.images.set(absolutePath, img);
        });
    }

    async preloadAudio(path) {
        const absolutePath = getAssetPath(path);
        if (this.sounds.has(absolutePath)) {
            return this.sounds.get(absolutePath);
        }

        this.totalAssets++;
        return new Promise((resolve) => {
            const audio = new Audio();
            // Resolver cuando se pueda reproducir sin interrupciones
            audio.oncanplaythrough = () => {
                audio.oncanplaythrough = null;
                audio.onerror = null;
                this.loadedAssets++;
                if (this.onProgress) {
                    this.onProgress(this.loadedAssets, this.totalAssets, path);
                }
                resolve(audio);
            };
            audio.onerror = () => {
                console.warn(`Error al precargar audio: ${path}`);
                this.loadedAssets++;
                if (this.onProgress) {
                    this.onProgress(this.loadedAssets, this.totalAssets, path);
                }
                resolve(audio); // Resolver de todos modos
            };
            audio.src = absolutePath;
            this.sounds.set(absolutePath, audio);
        });
    }

    getImage(path) {
        const absolutePath = getAssetPath(path);
        return this.images.get(absolutePath) || null;
    }

    getAudio(path) {
        const absolutePath = getAssetPath(path);
        return this.sounds.get(absolutePath) || null;
    }
}

export const assetsManager = new AssetManager();
