import type { TimelineDataProvider } from '@/scripts/services/timeline/GenericTimeline.ts'
import albumService from '@/scripts/services/albumService.ts'
import { useAlbumStore } from '@/scripts/stores/albumStore.ts'
import {
  TimelineItemsResponse,
  TimelineMonthItems,
  type TimelineRatiosResponse,
} from '@/scripts/types/generated/timeline.ts'

const albumStore = useAlbumStore()

export class AlbumTimelineProvider implements TimelineDataProvider {
  albumId: string
  ids: string[] = []
  ratios: number[] = []
  months: TimelineMonthItems[] = []

  constructor(albumId: string) {
    this.albumId = albumId
  }
  //todo: misschien moet de provider reactive? computed ids ofzo? zodat het reageert als er iets verandert in de
  // albumstore? idk maakt het wel raar want de timeline provider wordt gebruikt in de timeline store, en dit
  // zou dan andersom zijn

  // todo this whole thing is bad and has to be remade to fit both album and main timeline
  //  album needs 1 request for all info, main timeline needs 3

  async getIds(): Promise<TimelineRatiosResponse> {



  }

  async getRatios() {
    const { data } = await albumService.getAlbumDetails(this.albumId)
    return data.mediaItems.map((m) => 1)
  }

  async getMediaByMonths(monthIds: string[]): Promise<TimelineItemsResponse> {

  }
}
