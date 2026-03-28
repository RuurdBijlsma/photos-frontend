import type { Theme } from '@/scripts/types/themeColor.ts'

export interface Location {
  name: string | null
  admin1: string | null
  admin2: string | null
  countryCode: string
  countryName: string
}

export interface Face {
  positionX: number
  positionY: number
  width: number
  height: number
  confidence: number
  age: number
  sex: string
}

export interface ColorData {
  themes: Theme[]
  prominentColors: string[] | null
  averageHue: number
  averageSaturation: number
  averageLightness: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  histogram: { [key: string]: any } | null
}

export interface TimeDetails {
  timezoneName?: string
  timezoneOffsetSeconds?: number
  timezoneSource?: string
  sourceDetails: string
  sourceConfidence: string
}

export interface Weather {
  temperature?: number
  dewPoint?: number
  relativeHumidity?: number
  precipitation?: number
  snow?: number
  windDirection?: number
  windSpeed?: number
  peakWindGust?: number
  pressure?: number
  sunshineMinutes?: number
  condition?: string
  sunrise?: string
  sunset?: string
  dawn?: string
  dusk?: string
  isDaytime?: boolean
}

export interface MediaFeatures {
  mimeType: string
  sizeBytes: number
  isMotionPhoto: boolean
  motionPhotoPresentationTimestamp?: number
  isHdr: boolean
  isBurst: boolean
  burstId?: string
  captureFps?: number
  videoFps?: number
  isNightsight: boolean
  isTimelapse: boolean
  exif: { [key: string]: unknown }
}

export interface CameraSettings {
  iso?: number
  exposureTime?: number
  aperture?: number
  focalLength?: number
  cameraMake?: string
  cameraModel?: string
}

export interface Panorama {
  isPhotosphere: boolean
  projectionType?: string
  horizontalFovDeg?: number
  verticalFovDeg?: number
  centerYawDeg?: number
  centerPitchDeg?: number
}

export interface VisualAnalysis {
  createdAt: string
  faces: Face[]
  colors: ColorData | null
}

export interface Gps {
  latitude: number
  longitude: number
  altitude: number | null
  imageDirection: number | null
  location: Location | null
}

export interface FullMediaItem {
  id: string
  userId: number
  hash: string
  relativePath: string
  createdAt: string
  updatedAt: string
  width: number
  height: number
  isVideo: boolean
  durationMs?: number
  takenAtLocal: string
  takenAtUtc?: string
  usePanoramaViewer: boolean
  hasThumbnails: boolean
  visualAnalyses: VisualAnalysis[]
  gps?: Gps
  time: TimeDetails
  weather?: Weather
  mediaFeatures: MediaFeatures
  cameraSettings: CameraSettings
  panorama: Panorama
}
