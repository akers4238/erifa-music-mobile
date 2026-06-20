import settingState from '@/store/setting/state'
import { httpFetch } from '../../request'

const source = 'bilibili'
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const stripHtml = text => String(text || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim()

const buildHeaders = (bvid = '') => {
  const headers = {
    Referer: bvid ? `https://www.bilibili.com/video/${bvid}` : 'https://www.bilibili.com/',
    'User-Agent': userAgent,
  }
  const cookie = settingState.setting['common.bilibiliCookie']
  if (cookie) headers.Cookie = cookie
  return headers
}

const parseDuration = duration => {
  if (typeof duration == 'number') {
    const min = Math.floor(duration / 60)
    const sec = Math.floor(duration % 60)
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  const parts = String(duration || '').split(':')
  if (parts.length == 2 || parts.length == 3) return parts.map(part => part.padStart(2, '0')).join(':')
  return null
}

const normalizePic = pic => {
  if (!pic) return ''
  if (pic.startsWith('//')) return `https:${pic}`
  return pic
}

const buildMusicInfo = item => {
  const bvid = item.bvid || item.id || ''
  const title = stripHtml(item.title)
  const author = stripHtml(item.author || item.up_name || item.name)
  return {
    singer: author,
    name: title,
    albumName: author,
    albumId: bvid,
    source,
    interval: parseDuration(item.duration),
    songmid: bvid,
    img: normalizePic(item.pic),
    lrc: null,
    types: [{ type: '128k', size: null }],
    _types: {
      '128k': {
        size: null,
      },
    },
    typeUrl: {},
  }
}

const getViewInfo = bvid => {
  const requestObj = httpFetch(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, {
    headers: buildHeaders(bvid),
  })
  return requestObj.promise.then(({ body }) => {
    if (body?.code != 0 || !body?.data?.cid) throw new Error(body?.message || 'Get bilibili video info failed')
    return body.data
  })
}

const getAudioResource = (bvid, cid, type) => {
  const url = `https://api.bilibili.com/x/player/playurl?bvid=${encodeURIComponent(bvid)}&cid=${encodeURIComponent(cid)}&qn=16&fnval=16&fourk=1`
  const requestObj = httpFetch(url, {
    headers: buildHeaders(bvid),
  })
  return requestObj.promise.then(({ body }) => {
    if (body?.code != 0) throw new Error(body?.message || 'Get bilibili play url failed')
    const audio = body?.data?.dash?.audio?.[0]
    const audioUrl = audio?.baseUrl || audio?.base_url || audio?.backupUrl?.[0] || audio?.backup_url?.[0] || body?.data?.durl?.[0]?.url
    if (!audioUrl) throw new Error('Bilibili audio url not found')
    return {
      type,
      url: audioUrl,
      headers: buildHeaders(bvid),
      userAgent,
    }
  })
}

const musicSearch = {
  limit: 30,
  total: 0,
  page: 0,
  allPage: 1,
  search(str, page = 1, limit = this.limit) {
    const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(str)}&page=${page}&page_size=${limit}`
    const requestObj = httpFetch(url, {
      headers: buildHeaders(),
    })
    return requestObj.promise.then(({ body }) => {
      if (body?.code != 0) throw new Error(body?.message || 'Search bilibili failed')
      const result = body?.data?.result || []
      const total = Number(body?.data?.numResults || result.length)
      this.total = total
      this.page = page
      this.allPage = Math.max(1, Math.ceil(total / limit))
      return {
        list: result.map(buildMusicInfo),
        allPage: this.allPage,
        limit,
        total,
        source,
      }
    })
  },
}

export default {
  musicSearch,
  getMusicUrl(songInfo, type = '128k') {
    const bvid = songInfo.songmid || songInfo.id
    return {
      canceleFn() {},
      promise: getViewInfo(bvid).then(info => getAudioResource(bvid, info.cid, type)),
    }
  },
  getPic(songInfo) {
    return getViewInfo(songInfo.songmid || songInfo.id).then(info => normalizePic(info.pic))
  },
  getMusicDetailPageUrl(songInfo) {
    return `https://www.bilibili.com/video/${songInfo.songmid}`
  },
}
