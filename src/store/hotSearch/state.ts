// import { deduplicationList } from '@common/utils/renderer'

import musicSdk from '@/utils/musicSdk'

export declare type Source = string | 'all'

type SourceLists = Partial<Record<Source, string[]>>


export interface InitState {
  sources: Source[]
  sourceList: SourceLists
}

const builtinSources = musicSdk.sources
  .map(source => source.id)
  .filter(source => !!musicSdk[source as LX.OnlineSource]?.hotSearch)
const sources = builtinSources.length > 1 ? ['all', ...builtinSources] : builtinSources

const state: InitState = {
  sources,
  sourceList: {
    all: [],
    ...Object.fromEntries(builtinSources.map(source => [source, []])),
  },
}

export default state
