export interface GalleryPhoto {
  low: string // 200p
  medium: string // 1080p
  full: string // original quality
}

export interface GalleryVideo {
  video: string
  thumbnail: string
}

export class ImageLoader {
  private imageCache: { [key: string]: HTMLImageElement | HTMLVideoElement } =
    {}
  private promiseCache: {
    [key: string]: Promise<HTMLImageElement | HTMLVideoElement>
  } = {}

  async loadVideo(url: string): Promise<HTMLVideoElement> {
    return new Promise(resolve => {
      const video = document.createElement('video')
      video.setAttribute('controls', '')
      video.src = url
      resolve(video)
    })
  }

  async loadPhoto(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.src = url
      image.onload = () => resolve(image)
      image.onerror = reject
    })
  }

  async loadImageCached(url: string, isPhoto: boolean) {
    if (
      this.promiseCache[url] === undefined ||
      this.imageCache[url] === undefined
    ) {
      this.promiseCache[url] = (isPhoto ? this.loadPhoto : this.loadVideo)(url)
      this.imageCache[url] = await this.promiseCache[url]
    }
    return this.imageCache[url]
  }

  async preloadImage(image: GalleryPhoto | GalleryVideo) {
    const isPhoto = !('video' in image)
    if (isPhoto) {
      await Promise.all([
        this.loadImageCached(image.low, true),
        this.loadImageCached(image.medium, true),
        this.loadImageCached(image.full, true),
      ])
    } else {
      await Promise.all([
        this.loadImageCached(image.thumbnail, true),
        this.loadImageCached(image.video, false),
      ])
    }
    console.log('preloaded', image)
  }

  getHighestQualityPhoto(image: GalleryPhoto): HTMLImageElement | undefined {
    if (this.imageCache[image.full] !== undefined)
      return this.imageCache[image.full] as HTMLImageElement
    if (this.imageCache[image.medium] !== undefined)
      return this.imageCache[image.medium] as HTMLImageElement
    return this.imageCache[image.low] as HTMLImageElement | undefined
  }

  getVideo(image: GalleryVideo): HTMLVideoElement | undefined {
    return this.imageCache[image.video] as HTMLVideoElement | undefined
  }
}
