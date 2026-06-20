import songlistState, { type TagInfo, type ListDetailInfo, type ListInfo } from '@/store/songlist/state'
import songlistActions from '@/store/songlist/action'
import { deduplicationList, toNewMusicInfo } from '@/utils'
import musicSdk from '@/utils/musicSdk'


interface DetailPageCache { data: ListDetailInfo, sourcePage: number }
type LimitDetailCache = Map<string, DetailPageCache | ListDetailInfo['list']>
type CacheValue = LimitDetailCache | ListInfo

const cache = new Map<string, CacheValue>()
const LIST_LOAD_LIMIT = 30


/**
 * 获取排序列表
 * @param source
 * @returns
 */
export const getSortList = (source: LX.OnlineSource) => {
  return songlistState.sortList[source] ?? []
}

/**
 * 获取标签列表
 * @param source
 * @returns
 */
export const getTags = async<T extends LX.OnlineSource>(source: T) => {
  if (songlistState.tags[source]) return songlistState.tags[source] as TagInfo<T>
  if (!musicSdk[source]?.songList?.getTags) return Promise.reject(new Error('source not found: ' + source))
  const info = await (musicSdk[source].songList.getTags() as Promise<TagInfo<T>>)
  songlistActions.setTags(info, source)
  return info
}

/**
 * 设置列表加载加载前的基本信息（用于加载失败后的重新加载）
 * @param source
 * @param tagId
 * @param sortId
 */
export const setListInfo: typeof songlistActions.setListInfo = (source, tagId, sortId) => {
  clearList()
  songlistActions.setListInfo(source, tagId, sortId)
}
/**
 * 设置列表信息
 * @param result
 * @param tagId
 * @param sortId
 * @param page
 * @returns
 */
export const setList: typeof songlistActions.setList = (result, tagId, sortId, page) => {
  return songlistActions.setList(result, tagId, sortId, page)
}

export const clearList = () => {
  songlistActions.clearList()
}

/**
 * 获取歌单列表
 * @param source 歌单源
 * @param tabId 类型id
 * @param sortId 排序
 * @param page 页数
 * @param isRefresh 是否跳过缓存
 * @returns
 */
export const getList = async(source: LX.OnlineSource, tabId: string, sortId: string, page: number, isRefresh = false): Promise<ListInfo> => {
  if (!musicSdk[source]?.songList?.getList) return Promise.reject(new Error('source not found: ' + source))
  let pageKey = `slist__${source}__${sortId}__${tabId}__${page}`

  let listCache = cache.get(pageKey) as ListInfo
  if (listCache) {
    if (isRefresh) cache.delete(pageKey)
    else return listCache
  }

  return musicSdk[source].songList.getList(sortId, tabId, page).then((result: ListInfo) => {
    cache.set(pageKey, result)
    return result
    // if (pageKey != listInfo.key) return
    // setList(result, tabId, sortId, page)
  })
}


/**
 * 获取歌单详情内单页分页歌曲（用于在本地控制每页大小）
 * @param source 源
 * @param id 歌单id
 * @param page 页数
 * @returns
 */
const getListDetailLimit = async(source: LX.OnlineSource, id: string, page: number): Promise<ListDetailInfo> => {
  const sourceApi = musicSdk[source]?.songList
  if (!sourceApi?.getListDetail) return Promise.reject(new Error('source not found: ' + source))

  const listKey = `sdetail__${source}__${id}`
  const prevPageKey = `sdetail__${source}__${id}__${page - 1}`
  const tempListKey = `sdetail__${source}__${id}__temp`

  let listCache = cache.get(listKey) as LimitDetailCache
  if (!listCache) cache.set(listKey, listCache = new Map())
  let sourcePage = 0
  {
    const prevPageData = listCache.get(prevPageKey) as DetailPageCache
    if (prevPageData) sourcePage = prevPageData.sourcePage
  }

  const getSourceMaxPage = (sourceResult: ListDetailInfo) => Math.max(1, Math.ceil(sourceResult.total / (sourceResult.limit || LIST_LOAD_LIMIT)))
  const loadSourcePage = async(page: number) => {
    const result = await sourceApi.getListDetail(id, page) as ListDetailInfo
    result.list = deduplicationList(result.list.map(m => toNewMusicInfo(m)) as LX.Music.MusicInfoOnline[])
    return result
  }
  const savePage = (sourceResult: ListDetailInfo, pageIndex: number, pageList: LX.Music.MusicInfoOnline[], pageSourcePage: number) => {
    listCache.set(`sdetail__${source}__${id}__${pageIndex}`, {
      data: {
        ...sourceResult,
        list: pageList,
        page: pageIndex,
        limit: LIST_LOAD_LIMIT,
        maxPage: Math.max(1, Math.ceil(sourceResult.total / LIST_LOAD_LIMIT)),
      },
      sourcePage: pageSourcePage,
    })
  }

  return loadSourcePage(sourcePage + 1).then(async(result: ListDetailInfo) => {
    if (listCache !== cache.get(listKey)) throw new Error('list cache cleared')
    let p = page
    const tempList = listCache.get(tempListKey) as ListDetailInfo['list']
    if (tempList?.length) {
      result.list = [...tempList, ...result.list]
      listCache.delete(tempListKey)
    }
    sourcePage++

    while (result.list.length < LIST_LOAD_LIMIT && sourcePage < getSourceMaxPage(result)) {
      const nextResult = await loadSourcePage(sourcePage + 1)
      if (listCache !== cache.get(listKey)) throw new Error('list cache cleared')
      sourcePage++
      result = {
        ...nextResult,
        list: [...result.list, ...nextResult.list],
      }
    }

    do {
      if (result.list.length < LIST_LOAD_LIMIT && sourcePage < getSourceMaxPage(result)) {
        listCache.set(tempListKey, result.list.splice(0, result.list.length))
        break
      }
      savePage(result, p, result.list.splice(0, LIST_LOAD_LIMIT), sourcePage)
      p++
    } while (result.list.length > 0)

    let pageCache = listCache.get(`sdetail__${source}__${id}__${page}`) as DetailPageCache | undefined
    if (!pageCache) {
      savePage(result, page, [], sourcePage)
      pageCache = listCache.get(`sdetail__${source}__${id}__${page}`) as DetailPageCache
    }
    return pageCache.data
  })
}

/**
 * 设置列表加载加载前的基本信息（用于加载失败后的重新加载）
 * @param source
 * @param tagId
 * @param sortId
 */
export const setListDetailInfo: typeof songlistActions.setListDetailInfo = (source, id) => {
  clearListDetail()
  songlistActions.setListDetailInfo(source, id)
}
export const setListDetail: typeof songlistActions.setListDetail = (result, id, page) => {
  return songlistActions.setListDetail(result, id, page)
}

export const clearListDetail = () => {
  songlistActions.clearListDetail()
}

/**
 * 获取歌单内单页歌曲
 * @param id 歌单id
 * @param source 歌单源
 * @param isRefresh 是否跳过缓存
 * @returns
 */
export const getListDetail = async(id: string, source: LX.OnlineSource, page: number, isRefresh = false): Promise<ListDetailInfo> => {
  const listKey = `sdetail__${source}__${id}`
  const pageKey = `sdetail__${source}__${id}__${page}`

  let listCache = cache.get(listKey) as LimitDetailCache
  if (!listCache || isRefresh) {
    cache.set(listKey, listCache = new Map())
  }

  let pageCache = listCache.get(pageKey) as DetailPageCache
  if (pageCache) return pageCache.data

  return getListDetailLimit(source, id, page)
}

/**
 * 获取歌单内全部歌曲
 * @param id 歌单id
 * @param source 歌单源
 * @param isRefresh 是否跳过缓存
 * @returns
 */
export const getListDetailAll = async(source: LX.OnlineSource, id: string, isRefresh = false): Promise<LX.Music.MusicInfoOnline[]> => {
  // console.log(tabId)
  const listKey = `sdetail__${source}__${id}`
  let listCache = cache.get(listKey) as LimitDetailCache
  if (!listCache || isRefresh) {
    cache.set(listKey, listCache = new Map())
  }

  const loadData = async(page: number): Promise<ListDetailInfo> => {
    const pageKey = `sdetail__${source}__${id}__${page}`
    let pageCache = listCache.get(pageKey) as DetailPageCache
    if (pageCache) return pageCache.data
    return getListDetailLimit(source, id, page)
  }
  return loadData(1).then(async result => {
    if (result.total <= result.limit) return result.list

    let maxPage = Math.ceil(result.total / result.limit)
    const loadDetail = async(loadPage = 2): Promise<LX.Music.MusicInfoOnline[]> => {
      return loadPage == maxPage
        ? loadData(loadPage).then(result => result.list)
        // eslint-disable-next-line @typescript-eslint/promise-function-async
        : loadData(loadPage).then(result1 => loadDetail(++loadPage).then(result2 => [...result1.list, ...result2]))
    }
    return loadDetail().then(result2 => [...result.list, ...result2])
  }).then(list => deduplicationList(list))
}
