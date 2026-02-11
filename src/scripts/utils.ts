import { THUMBNAIL_SIZES } from '@/scripts/constants.ts'

export function prettyBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function requestIdleCallbackAsync(
  cb: (deadline: IdleDeadline) => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    requestIdleCallback(async (deadline) => {
      try {
        await cb(deadline)
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  })
}

export function toHms(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.round(totalSeconds % 60)
  if (hours > 0)
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function getThumbnailHeight(rowHeight: number) {
  for (const size of THUMBNAIL_SIZES) {
    if (size > rowHeight) return size
  }
  return THUMBNAIL_SIZES[THUMBNAIL_SIZES.length - 1]!
}

export const stringToColor = (
  str: string,
  saturation: number = 50,
  lightness: number = 75,
): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
