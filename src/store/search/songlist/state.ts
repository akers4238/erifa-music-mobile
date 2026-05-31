// import { deduplicationList } from '@common/utils/renderer'

import { type ListInfo } from '@/store/songlist/state'
export type { ListInfoItem } from '@/store/songlist/state'

export type SearchListInfo = Omit<ListInfo, 'source' | 'maxPage'>


interface ListInfos extends Partial<Record<string, SearchListInfo>> {
  'all': SearchListInfo
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
      limit: 15,
      total: 0,
      list: [],
      key: null,
      tagId: '',
      sortId: '',
    },
  },
  maxPages: {},
}

export const maxPages: Partial<Record<string, number>> = {}

export default state
