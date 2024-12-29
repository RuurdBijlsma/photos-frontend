export interface GalleryPhoto {
  low: string // 200p
  medium: string // 1080p
  full: string // original quality
}
export interface GalleryVideo{
  video:string
  thumbnail:string
}

export class ImageLoader {
  private imageCache: { [key: string]: HTMLImageElement } = {}
  private promiseCache: { [key: string]: Promise<HTMLImageElement> } = {}

  async loadPhoto(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.src = url
      image.onload = () => resolve(image)
      image.onerror = reject
    })
  }

  async loadImageCached(url: string) {
    if (this.promiseCache[url] === undefined) {
      this.promiseCache[url] = this.loadPhoto(url)
      this.imageCache[url] = await this.promiseCache[url]
    }
    return this.imageCache[url]
  }

  async preloadImage(image: GalleryPhoto) {
    await Promise.all([
      this.loadImageCached(image.low),
      this.loadImageCached(image.medium),
      this.loadImageCached(image.full),
    ])
    console.log('preloaded', image)
  }

  getHighestQualityImage(image: GalleryPhoto): HTMLImageElement | undefined {
    if (this.imageCache[image.full] !== undefined)
      return this.imageCache[image.full]
    if (this.imageCache[image.medium] !== undefined)
      return this.imageCache[image.medium]
    return this.imageCache[image.low]
  }
}
