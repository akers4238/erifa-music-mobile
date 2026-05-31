// import { deduplicationList } from '@common/utils/renderer'

export declare type Source = string | 'all'

type SourceLists = Partial<Record<Source, string[]>>


export interface InitState {
  sources: Source[]
  sourceList: SourceLists
}

const state: InitState = {
  sources: [],
  sourceList: {
    all: [],
  },
}

export default state
