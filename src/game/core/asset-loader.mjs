export class AssetLoader {
  constructor() {
    this.images = new Map();
  }

  async loadImage(url) {
    if (!url) return null;
    if (this.images.has(url)) return this.images.get(url);

    const image = new Image();
    const promise = new Promise((resolve) => {
      image.addEventListener("load", () => resolve(image), { once: true });
      image.addEventListener("error", () => resolve(null), { once: true });
    });

    image.decoding = "async";
    image.src = url;
    const result = await promise;
    this.images.set(url, result);
    return result;
  }

  async preload(urls) {
    await Promise.all([...new Set(urls)].map((url) => this.loadImage(url)));
  }

  getImage(url) {
    return this.images.get(url) ?? null;
  }
}
