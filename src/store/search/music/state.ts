export declare interface ListInfo {
  list: LX.Music.MusicInfoOnline[]
  total: number
  page: number
  maxPage: number
  limit: number
  key: string | null
}

interface ListInfos extends Partial<Record<string, ListInfo>> {
  'all': ListInfo
}

export type Source = string | 'all'

export interface InitState {
  searchText: string
  source: Source
  sources: Source[]
  listInfos: ListInfos
  maxPages: Partial<Record<string, number>>
}

const state: InitState = {
  searchText: '',
  source: '',
  sources: [],
  listInfos: {
    all: {
      page: 1,
      maxPage: 0,
      limit: 30,
      total: 0,
      list: [],
      key: null,
    },
  },
  maxPages: {},
}

export default state
