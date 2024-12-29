<template>
  <div class="image-viewer">
    <canvas ref="canvas" class="photo-canvas" />
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, type Ref, ref } from 'vue'

const images = [
  'https://fastly.picsum.photos/id/778/1920/1080.jpg?hmac=OOFXAqXlF9l_Jo6tQCNwN3xgrCkl5wyFCw03FanLKGc',
  'https://fastly.picsum.photos/id/72/1920/1080.jpg?hmac=6BY3KGhrhKlv3VOGlNKrECnIizq_P5l4v20TvanoUbE',
  'https://fastly.picsum.photos/id/778/1920/1080.jpg?hmac=OOFXAqXlF9l_Jo6tQCNwN3xgrCkl5wyFCw03FanLKGc',
  'https://fastly.picsum.photos/id/21/1920/1080.jpg?hmac=1BnxKswnhchVaU4-xZpgObgnwGLLb7hnugRQ9vwwUFY',
  'https://fastly.picsum.photos/id/778/1920/1080.jpg?hmac=OOFXAqXlF9l_Jo6tQCNwN3xgrCkl5wyFCw03FanLKGc',
  'https://fastly.picsum.photos/id/876/1920/1080.jpg?hmac=RiA84kFcXsag03tcAK80WXgrvjmjsqQvjx8ovhX5le4',
  'https://fastly.picsum.photos/id/778/1920/1080.jpg?hmac=OOFXAqXlF9l_Jo6tQCNwN3xgrCkl5wyFCw03FanLKGc',
  'https://fastly.picsum.photos/id/576/1920/1080.jpg?hmac=4SczqqyiYj8_DwymFUpSl6uEkd8VomRlOrMP99yQtn8',
]
const imageIndex = 0
const imageCache: { [key: string]: HTMLImageElement } = {}

const canvas: Ref<HTMLCanvasElement | null> = ref(null)
let animationRequest = 0

const loadImage = async (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.src = url
    image.onload = () => resolve(image)
    image.onerror = reject
  })
}
const loadImageCached = async (url: string) => {
  if (imageCache[url] === undefined) {
    imageCache[url] = await loadImage(url)
  }
  return imageCache[url]
}
loadImageCached(images[imageIndex]).then()
const render = async (
  cv: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
) => {
  animationRequest = requestAnimationFrame(() => render(cv, context))
  context.clearRect(0, 0, cv.width, cv.height)
  context.fillRect(10, 10, 20, 20)
  const image = imageCache[images[imageIndex]]
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
