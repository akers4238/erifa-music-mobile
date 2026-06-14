import { eapiRequest, normalizeEnhancedUrl } from './utils/api-enhanced'

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

const requestPlayerUrl = (songmid, type) => {
  const quality = qualityMap[type] || qualityMap['320k']
  const requestObj = eapiRequest('/api/song/enhance/player/url', {
    ids: JSON.stringify([String(songmid)]),
    br: quality.br,
  })
  return requestObj.promise.then(({ body }) => normalizeEnhancedUrl(body, type))
}

export default {
  getMusicUrl(songInfo, type) {
    const targetType = type || '320k'
    let requestObj = requestPlayerUrl(songInfo.songmid, targetType)
      .catch(() => targetType == '128k'
        ? Promise.reject(new Error('Get music url failed'))
        : requestPlayerUrl(songInfo.songmid, '128k'))

    return {
      promise: requestObj,
      cancelHttp() {},
    }
  },
}
