export function prettyBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function requestIdleCallbackAsync(cb: (deadline: IdleDeadline) => Promise<void>): Promise<void> {
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
