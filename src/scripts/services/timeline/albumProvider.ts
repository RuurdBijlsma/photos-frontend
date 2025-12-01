import photoService from '@/scripts/services/photoService.ts'
import type { TimelineDataProvider } from '@/scripts/services/timeline/GenericTimeline.ts'

export class AlbumTimelineProvider implements TimelineDataProvider {
  constructor(private albumId: string) {}

  async getIds() {
    const { data } = await photoService.getTimelineIds()
    return data
  }

  async getRatios() {
    return await photoService.getTimelineRatios()
  }

  async getMediaByMonths(monthIds: string[]) {
    return await photoService.getMediaByMonths(monthIds)
  }
}
