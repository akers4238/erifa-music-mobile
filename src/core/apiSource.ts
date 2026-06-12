// import { setUserApi as setUserApiAction } from '@renderer/utils/ipc'
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import musicSdk from '@/utils/musicSdk'
// import apiSourceInfo from '@renderer/utils/musicSdk/api-source-info'
import { updateSetting } from './common'
import settingState from '@/store/setting/state'
import { destroyUserApi, setUserApi, setUserApiStatus } from './userApi'
import searchMusicState from '@/store/search/music/state'
import searchSonglistState from '@/store/search/songlist/state'
import searchState from '@/store/search/state'
import hotSearchState from '@/store/hotSearch/state'
import songlistState from '@/store/songlist/state'
import leaderboardState from '@/store/leaderboard/state'
import commonActions from '@/store/common/action'

const builtinSourceEntries = [...musicSdk.sources]

const createMusicSearchListInfo = () => ({
  page: 1,
  maxPage: 0,
  limit: 30,
  total: 0,
  list: [],
  key: null,
})

const createSongListSearchListInfo = () => ({
  page: 1,
  limit: 15,
  total: 0,
  list: [],
  key: null,
  tagId: '',
  sortId: '',
})

const getBuiltinSources = <T extends LX.OnlineSource>(checker: (source: T) => boolean) => {
  return builtinSourceEntries
    .map(source => source.id as T)
    .filter(checker)
}

const resetBuiltinApiState = () => {
  const musicSearchSources = getBuiltinSources<LX.OnlineSource>(source => !!musicSdk[source]?.musicSearch)
  const songListSearchSources = getBuiltinSources<LX.OnlineSource>(source => !!musicSdk[source]?.songList?.search)
  const songListSources = getBuiltinSources<LX.OnlineSource>(source => !!musicSdk[source]?.songList?.getList)
  const leaderboardSources = getBuiltinSources<LX.OnlineSource>(source => !!musicSdk[source]?.leaderboard?.getBoards)
  const hotSearchSources = getBuiltinSources<LX.OnlineSource>(source => !!musicSdk[source]?.hotSearch)

  ;(musicSdk as any).sources = builtinSourceEntries
  searchState.temp_source = ''

  searchMusicState.source = ''
  searchMusicState.sources = musicSearchSources.length > 1 ? ['all', ...musicSearchSources] : musicSearchSources
  searchMusicState.listInfos = {
    all: createMusicSearchListInfo(),
    ...Object.fromEntries(musicSearchSources.map(source => [source, createMusicSearchListInfo()])),
  }
  searchMusicState.maxPages = {}

  searchSonglistState.source = ''
  searchSonglistState.sources = songListSearchSources.length > 1 ? ['all', ...songListSearchSources] : songListSearchSources
  searchSonglistState.listInfos = {
    all: createSongListSearchListInfo(),
    ...Object.fromEntries(songListSearchSources.map(source => [source, createSongListSearchListInfo()])),
  }
  searchSonglistState.maxPages = {}

  songlistState.sources = songListSources
  songlistState.sortList = Object.fromEntries(songListSources.map(source => [source, musicSdk[source].songList.sortList ?? []]))
  songlistState.tags = {}

  leaderboardState.sources = leaderboardSources
  leaderboardState.boards = {}

  hotSearchState.sources = hotSearchSources.length > 1 ? ['all', ...hotSearchSources] : hotSearchSources
  hotSearchState.sourceList = {
    all: [],
    ...Object.fromEntries(hotSearchSources.map(source => [source, []])),
  }
  commonActions.setSourceNames({})
}

export const setApiSource = (apiId: string) => {
  if (global.lx.apiInitPromise[1]) {
    global.lx.apiInitPromise[0] = new Promise(resolve => {
      global.lx.apiInitPromise[1] = false
      global.lx.apiInitPromise[2] = (result: boolean) => {
        global.lx.apiInitPromise[1] = true
        resolve(result)
      }
    })
  }
  if (/^user_api/.test(apiId)) {
    setUserApi(apiId).catch(err => {
      const message = err instanceof Error ? err.message : String(err)
      setUserApiStatus(false, message)
      if (!global.lx.apiInitPromise[1]) global.lx.apiInitPromise[2](false)
      console.log(err)
    })
  } else {
    // @ts-expect-error
    global.lx.qualityList = musicSdk.supportQuality[apiId] ?? {}
    destroyUserApi()
    resetBuiltinApiState()
    if (!global.lx.apiInitPromise[1]) global.lx.apiInitPromise[2](true)
    // apiSource.value = apiId
    // void setUserApiAction(apiId)
  }

  if (apiId != settingState.setting['common.apiSource']) {
    updateSetting({ 'common.apiSource': apiId })
    requestAnimationFrame(() => {
      global.state_event.apiSourceUpdated(apiId)
    })
  }
}
