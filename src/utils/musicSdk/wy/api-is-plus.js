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

const requestPlayerUrlV1 = (songmid, type) => {
  const quality = qualityMap[type] || qualityMap['320k']
  const requestObj = eapiRequest('/api/song/enhance/player/url/v1', {
    ids: `[${songmid}]`,
    level: quality.level,
    encodeType: 'flac',
  })
  return requestObj.promise.then(({ body }) => normalizeEnhancedUrl(body, type))
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
      .catch(() => requestPlayerUrlV1(songInfo.songmid, targetType))

    return {
      promise: requestObj,
      cancelHttp() {},
    }
  },
}
