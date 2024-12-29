<template>
  <div class="image-viewer">
    <canvas ref="canvas" class="photo-canvas" />
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, type Ref, ref } from 'vue'
import {
  ImageLoader,
  type GalleryPhoto,
  type GalleryVideo,
} from '@/utils/imageLoader'

const imageLoader = new ImageLoader()
// todo:
// swipe/click next
// preload video?
// show video
// zoom/pan

const images: (GalleryPhoto | GalleryVideo)[] = [
  {
    low: 'https://picsum.photos/300/200',
    medium: 'https://picsum.photos/1920/1080',
    full: 'https://picsum.photos/2560/1440',
  },
  {
    low: 'https://picsum.photos/300/200',
    medium: 'https://picsum.photos/1920/1080',
    full: 'https://picsum.photos/2560/1440',
  },
  {
    video: 'img/vid.mp4',
    thumbnail: 'https://picsum.photos/300/200',
  },
  {
    low: 'https://picsum.photos/300/200',
    medium: 'https://picsum.photos/1920/1080',
    full: 'https://picsum.photos/2560/1440',
  },
  {
    low: 'https://picsum.photos/300/200',
    medium: 'https://picsum.photos/1920/1080',
    full: 'https://picsum.photos/2560/1440',
  },
  {
    low: 'https://picsum.photos/300/200',
    medium: 'https://picsum.photos/1920/1080',
    full: 'https://picsum.photos/2560/1440',
  },
  {
    low: 'https://picsum.photos/300/200',
    medium: 'https://picsum.photos/1920/1080',
    full: 'https://picsum.photos/2560/1440',
  },
  {
    low: 'https://picsum.photos/300/200',
    medium: 'https://picsum.photos/1920/1080',
    full: 'https://picsum.photos/2560/1440',
  },
]
const imageIndex = 0
const preloadNeighbours = 1

const canvas: Ref<HTMLCanvasElement | null> = ref(null)
let animationRequest = 0
const loadNeighbours = () => {
  for (let i = -preloadNeighbours; i <= preloadNeighbours; i++) {
    if (i === 0 || images[imageIndex + i] === undefined) continue
    imageLoader.preloadImage(images[imageIndex + i])
  }
}

imageLoader.preloadImage(images[imageIndex]).then(loadNeighbours)
const render = async (
  cv: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
) => {
  animationRequest = requestAnimationFrame(() => render(cv, context))
  context.clearRect(0, 0, cv.width, cv.height)
  context.fillRect(10, 10, 20, 20)
  const image = imageLoader.getHighestQualityImage(images[imageIndex])
  if (image === undefined) return
  // draw image while keeping aspect ratio
  const canvasRatio = cv.width / cv.height
  const imageRatio = image.width / image.height
  if (canvasRatio > imageRatio) {
    // canvas wider than image
    const imgWidth = cv.height * imageRatio
    context.drawImage(
      image,
      cv.width / 2 - imgWidth / 2,
      0,
      imgWidth,
      cv.height,
    )
  } else {
    // image wider than canvas
    const imgHeight = cv.width / imageRatio
    context.drawImage(
      image,
      0,
      cv.height / 2 - imgHeight / 2,
      cv.width,
      imgHeight,
    )
  }
}

const setupCanvas = (
  cv: HTMLCanvasElement,
  context: CanvasRenderingContext2D | null,
) => {
  if (context === null) return
  render(cv, context)
}
const windowResize = () => {
  if (canvas.value == null) return
  canvas.value.setAttribute('width', window.innerWidth.toString())
  canvas.value.setAttribute('height', window.innerHeight.toString())
}

onMounted(() => {
  if (canvas.value != null)
    setupCanvas(canvas.value, canvas.value.getContext('2d'))
  window.addEventListener('resize', windowResize)
  windowResize()
})
onUnmounted(() => {
  window.removeEventListener('resize', windowResize)
  cancelAnimationFrame(animationRequest)
})
</script>
<style scoped>
.image-viewer {
  background-color: rgba(0, 0, 0, 0.95);
  width: 100%;
  height: 100%;
  position: absolute;
}

.photo-canvas {
  position: absolute;
}
</style>
