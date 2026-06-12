import { httpFetch } from '../../request'
import { eapi } from './utils/crypto'

const qualityMap = {
  '128k': {
    level: 'standard',
    br: 128000,
  },
  '320k': {
    level: 'exhigh',
    br: 320000,
  },
  flac: {
    level: 'lossless',
    br: 999000,
  },
  flac24bit: {
    level: 'hires',
    br: 1999000,
  },
}

const userAgent = 'NeteaseMusic/9.2.30.240910161425(9002030);Dalvik/2.1.0'

const eapiDirectRequest = (path, data) => httpFetch(`https://interface.music.163.com/eapi${path.replace(/^\/api/, '')}`, {
  method: 'post',
  headers: {
    'User-Agent': userAgent,
    origin: 'https://music.163.com',
    referer: 'https://music.163.com/',
    cookie: 'os=android; appver=9.2.30; channel=netease;',
  },
  form: eapi(path, data),
})

const normalizeUrl = (body, type) => {
  const item = Array.isArray(body?.data) ? body.data[0] : body?.data
  if (!item?.url) throw new Error('Get music url failed')
  return {
    type,
    url: item.url,
    headers: {
      Referer: 'https://music.163.com/',
      'User-Agent': userAgent,
    },
  }
}

const requestPlayerUrlV1 = (songmid, type) => {
  const quality = qualityMap[type] || qualityMap['320k']
  const requestObj = eapiDirectRequest('/api/song/enhance/player/url/v1', {
    ids: `[${songmid}]`,
    level: quality.level,
    encodeType: 'flac',
  })
  return requestObj.promise.then(({ body }) => normalizeUrl(body, type))
}

const requestPlayerUrl = (songmid, type) => {
  const quality = qualityMap[type] || qualityMap['320k']
  const requestObj = eapiDirectRequest('/api/song/enhance/player/url', {
    ids: JSON.stringify([String(songmid)]),
    br: quality.br,
  })
  return requestObj.promise.then(({ body }) => normalizeUrl(body, type))
}

export default {
  getMusicUrl(songInfo, type) {
    const targetType = type || '320k'
    let requestObj = requestPlayerUrlV1(songInfo.songmid, targetType)
      .catch(() => requestPlayerUrl(songInfo.songmid, targetType))

    return {
      promise: requestObj,
      cancelHttp() {},
    }
  },
}
