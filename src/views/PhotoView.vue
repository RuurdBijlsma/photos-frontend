<script setup lang="ts">
import { onMounted, onUnmounted, type Ref, ref } from 'vue'
import {
  ImageLoader,
  type GalleryPhoto,
  type GalleryVideo,
} from '@/utils/imageLoader'

const imageLoader = new ImageLoader()
// todo:
// make into video/photo viewer, with api to control next/prev etc.
// Only request animation frame when a change happens (pan/zoom/animation)
// swipe/click next
// preload video?
// show video
// zoom/pan
// Use photos from server

const images: (GalleryPhoto | GalleryVideo)[] = [
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
    low: 'https://fastly.picsum.photos/id/265/300/200.jpg?hmac=MrwpaERW4NpOzcMmLfbpWZ2MkqF8KszvZlWcyekcwIM',
    medium:
      'https://fastly.picsum.photos/id/127/1920/1080.jpg?hmac=tUwxvd6-glVoeBPFwke9_OgXuiRXo6nkorjL4pcBU94',
    full: 'https://fastly.picsum.photos/id/473/2560/1440.jpg?hmac=FBqbIt85nI9UP8OqHksf9hXPYCErBOmm3GewzWhMOuU',
  },
  {
    low: 'https://fastly.picsum.photos/id/811/300/200.jpg?hmac=p5zABdkfWX3bHz6VkK2muI4aCer-DlO3jOAD-wXlbw0',
    medium:
      'https://fastly.picsum.photos/id/237/1920/1080.jpg?hmac=1hPzsubx1j8fMddzUgP5NbuX2rNLOEaQML1rD_g1C5Y',
    full: 'https://fastly.picsum.photos/id/881/2560/1440.jpg?hmac=kF7lm1dL2bciWR5FZXTnW4gOjnZLYF1oHTkfcUJgpqE',
  },
  {
    low: 'https://fastly.picsum.photos/id/599/300/200.jpg?hmac=xs2qtNU5zWp3TjPVmPGbqPSadIWjfPuVNOo_zX_OM8M',
    medium:
      'https://fastly.picsum.photos/id/692/1920/1080.jpg?hmac=Oq1BbdEMm2D6VOmB_sNxcxilNNFjY3cje_xZTn5onTk',
    full: 'https://fastly.picsum.photos/id/567/2560/1440.jpg?hmac=B7GvE3Wa3qgVhj73xrfTAOVKxs8E9UXNKYIhbO7JoeY',
  },
  {
    low: 'https://fastly.picsum.photos/id/214/300/200.jpg?hmac=xAr0P6sJ-SSjhq-GSAdByEb_5k7MBsc_gXfND4uFDhM',
    medium:
      'https://fastly.picsum.photos/id/705/1920/1080.jpg?hmac=ZunPnmcn7rFg_65607aE_udOxVHshBXTepX645_g7Cg',
    full: 'https://fastly.picsum.photos/id/922/2560/1440.jpg?hmac=NGenG4TJN78_yqKfWOJ-SuD_zLVQhVlg5T2ZgDDMWZk',
  },
  {
    low: 'https://fastly.picsum.photos/id/326/300/200.jpg?hmac=Q_QdWLXbxZsoVPBALxP4W-8U8DXm_P5MvSnp8715aPs',
    medium:
      'https://fastly.picsum.photos/id/743/1920/1080.jpg?hmac=-HNSMW1n9zrX12RRMQSKExyi-RRw_f6-6GbZrm1esS0',
    full: 'https://fastly.picsum.photos/id/726/2560/1440.jpg?hmac=aEMEk7V9LgrsodcLe3g5rRUnEyAafe71YGmPA6Ga8Y0',
  },
]
let imageIndex = 0
let shownImage: GalleryVideo | GalleryPhoto | undefined = undefined
const preloadNeighbours = 1

const canvas: Ref<HTMLCanvasElement | null> = ref(null)
const videoContainer: Ref<HTMLDivElement | null> = ref(null)

let animationRequest = 0
const loadNeighbours = () => {
  const promises: Promise<void>[] = []
  for (let i = -preloadNeighbours; i <= preloadNeighbours; i++) {
    if (i === 0 || images[imageIndex + i] === undefined) continue
    const image = images[imageIndex + i]
    promises.push(imageLoader.preloadImage(image))
  }
  return Promise.all(promises)
}

async function handleImage(image: GalleryVideo | GalleryPhoto) {
  shownImage = image
  const vidContainer = videoContainer.value
  if ('video' in image && vidContainer) {
    await imageLoader.loadImageCached(image.video, false)
    const videoElement = imageLoader.getVideo(image)
    if (videoElement !== undefined) vidContainer.replaceChildren(videoElement)
  } else if (vidContainer) {
    vidContainer?.replaceChildren()
  }
  await imageLoader.preloadImage(image)
  await loadNeighbours()
}

const skip = (n: number = 0) => {
  imageIndex += n
  const image = images[imageIndex]
  handleImage(image).then(() => {
    if ('video' in image) console.log(imageLoader.getVideo(image))
  })
  console.log(`Next to ${imageIndex}`)
}

const render = async (
  cv: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
) => {
  animationRequest = requestAnimationFrame(() => render(cv, context))
  context.clearRect(0, 0, cv.width, cv.height)
  if (shownImage === undefined || 'video' in shownImage) return
  const element = imageLoader.getHighestQualityPhoto(shownImage)
  if (element === undefined) return
  // draw image while keeping aspect ratio
  const canvasRatio = cv.width / cv.height
  const imageRatio = element.width / element.height
  if (canvasRatio > imageRatio) {
    // canvas wider than image
    const imgWidth = cv.height * imageRatio
    context.drawImage(
      element,
      cv.width / 2 - imgWidth / 2,
      0,
      imgWidth,
      cv.height,
    )
  } else {
    // image wider than canvas
    const imgHeight = cv.width / imageRatio
    context.drawImage(
      element,
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
  skip(0)
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

<template>
  <div class="image-viewer">
    <canvas ref="canvas" class="photo-canvas" />
    <div class="video-container" ref="videoContainer"></div>
    <v-btn @click="skip(-1)">prev image</v-btn>
    <v-btn @click="skip(1)">next image</v-btn>
  </div>
</template>

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

.video-container {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.video-container:deep(video) {
  width: 100%;
  height: 100%;
  margin-bottom: -7px;
  top: 0;
  left: 0;
}
</style>
