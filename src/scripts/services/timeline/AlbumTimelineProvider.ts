import type { TimelineDataProvider } from '@/scripts/services/timeline/GenericTimeline.ts'
import albumService from '@/scripts/services/albumService.ts'

export class AlbumTimelineProvider implements TimelineDataProvider {
  albumId: string

  constructor(albumId: string) {
    this.albumId = albumId
  }

  async getIds() {
    const { data } = await albumService.getTimelineIds(this.albumId)
    return data
  }

  async getRatios() {
    return await albumService.getTimelineRatios(this.albumId)
  }

  async getMediaByMonths(monthIds: string[]) {
    return await albumService.getMediaByMonths(this.albumId, monthIds)
  }
}
