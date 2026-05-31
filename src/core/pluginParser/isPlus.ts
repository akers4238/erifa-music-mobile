export const isPlusPluginScript = (script: string) => {
  return /\bplatform\s*:/.test(script) &&
    /\bgetMediaSource\s*:|\bgetMediaSource\s*\(/.test(script) &&
    (/\bmodule\.exports\b/.test(script) || /\bexports\./.test(script) || /\bexport\s+default\b/.test(script))
}

const normalizePlusPluginScript = (script: string) => {
  return script.replace(/\bexport\s+default\b/, 'module.exports.default =')
}

export const wrapPlusPluginScript = (script: string) => {
  const pluginCode = normalizePlusPluginScript(script)
  return `/*
 * @name Is Plus Plugin Adapter
 * @description MusicFree/Plus plugin compatibility wrapper
 * @author Is Plus
 * @version 1.0.0
 */
(() => {
  const module = { exports: {} }
  const exports = module.exports

  const appendParams = (url, params) => {
    if (!params || typeof params !== 'object') return url
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
      .join('&')
    if (!query) return url
    return url + (url.includes('?') ? '&' : '?') + query
  }

  const request = (url, options = {}) => new Promise((resolve, reject) => {
    url = appendParams(url, options.params)
    lx.request(url, {
      method: options.method || 'get',
      timeout: options.timeout,
      headers: options.headers,
      body: options.data ?? options.body,
      form: options.form,
      formData: options.formData,
      binary: options.responseType === 'arraybuffer' || options.binary === true,
    }, (error, response, body) => {
      if (error) {
        reject(error)
        return
      }
      resolve({
        data: body,
        status: response.statusCode,
        statusText: response.statusMessage,
        headers: response.headers,
        body,
      })
    })
  })

  const axios = (configOrUrl, config = {}) => {
    const options = typeof configOrUrl === 'string'
      ? { ...config, url: configOrUrl }
      : configOrUrl
    return request(options.url, options)
  }
  axios.get = (url, config = {}) => request(url, { ...config, method: 'get' })
  axios.post = (url, data, config = {}) => request(url, { ...config, method: 'post', data })
  axios.default = axios

  const pad2 = value => String(value).padStart(2, '0')
  const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
    const values = {
      YYYY: String(date.getFullYear()),
      MM: pad2(date.getMonth() + 1),
      DD: pad2(date.getDate()),
      HH: pad2(date.getHours()),
      mm: pad2(date.getMinutes()),
      ss: pad2(date.getSeconds()),
    }
    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, key => values[key])
  }
  const dayjs = (value) => {
    const date = value == null ? new Date() : new Date(value)
    return {
      format(format) {
        return formatDate(date, format)
      },
      valueOf() {
        return date.getTime()
      },
      toDate() {
        return date
      },
    }
  }
  dayjs.unix = (value) => dayjs(Number(value || 0) * 1000)

  const he = {
    decode(value = '') {
      return String(value)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    },
  }
  const cheerio = {
    load(html = '') {
      return (selector) => ({
        text() {
          if (selector === '#__RENDER_DATA__') {
            const match = String(html).match(/<script[^>]+id=["']__RENDER_DATA__["'][^>]*>([\\s\\S]*?)<\\/script>/i)
            return match ? match[1] : ''
          }
          return ''
        },
      })
    },
  }
  const cryptoJs = {
    enc: {
      Hex: 'hex',
    },
    MD5(value) {
      return {
        toString() {
          return lx.utils.crypto.md5(String(value))
        },
      }
    },
    HmacSHA256() {
      throw new Error('Unsupported Plus crypto-js HmacSHA256')
    },
  }

  const require = (name) => {
    if (name === 'axios') return axios
    if (name === 'dayjs') return dayjs
    if (name === 'he') return he
    if (name === 'cheerio') return cheerio
    if (name === 'crypto-js') return cryptoJs
    throw new Error('Unsupported Plus require: ' + name)
  }
  const env = {
    appVersion: lx.currentScriptInfo.version || '',
    os: 'android',
    lang: 'zh-CN',
    getUserVariables() {
      return {}
    },
    get userVariables() {
      return {}
    },
  }
  const process = {
    platform: 'android',
    version: env.appVersion,
    env,
  }

${pluginCode}

  const plugin = module.exports && module.exports.default ? module.exports.default : module.exports
  if (!plugin || typeof plugin !== 'object') throw new Error('Invalid Plus plugin')

  const platform = String(plugin.platform || lx.currentScriptInfo.name || 'isplus')
  const actions = ['musicUrl']
  if (typeof plugin.search === 'function') actions.push('search')
  if (typeof plugin.getLyric === 'function') actions.push('lyric')
  if (typeof plugin.getMusicInfo === 'function') actions.push('pic')

  const normalizeMusicItem = (musicInfo, source) => ({
    ...musicInfo,
    platform: musicInfo.platform || musicInfo.source || source,
  })
  const normalizeUrl = (result) => {
    if (typeof result === 'string') return result
    if (result && typeof result.url === 'string') return result.url
    return ''
  }
  const normalizeLyric = (result) => {
    if (typeof result === 'string') return { lyric: result }
    if (!result || typeof result !== 'object') return { lyric: '' }
    return {
      lyric: result.lyric || result.rawLrc || result.lrc || '',
      tlyric: result.tlyric || result.translation || null,
      rlyric: result.rlyric || result.romaLrc || null,
      lxlyric: result.lxlyric || null,
    }
  }
  const normalizePic = (result) => {
    if (!result || typeof result !== 'object') return ''
    return result.artwork || result.cover || result.pic || result.img || ''
  }
  const normalizeQuality = (quality) => {
    switch (quality) {
      case '128k':
        return 'low'
      case '320k':
        return 'standard'
      case 'flac':
        return 'high'
      case 'flac24bit':
        return 'super'
      default:
        return quality || 'standard'
    }
  }
  const normalizeInterval = (value) => {
    const duration = Number(value || 0)
    if (!duration) return null
    const seconds = duration > 1000 ? Math.round(duration / 1000) : Math.round(duration)
    const minute = Math.floor(seconds / 60)
    const second = String(seconds % 60).padStart(2, '0')
    return minute + ':' + second
  }
  const normalizeQualitys = (item) => {
    const candidates = item.qualities || item.qualitys || {}
    if (Array.isArray(candidates)) {
      return candidates.map(q => typeof q === 'string' ? q : q?.type).filter(Boolean)
    }
    if (candidates && typeof candidates === 'object') {
      return Object.keys(candidates)
    }
    return ['128k', '320k', 'flac', 'flac24bit']
  }
  const normalizeSearchItem = (item, index) => {
    const source = platform
    const songId = item.id || item.songId || item.songmid || item.hash || index
    const qualitys = normalizeQualitys(item)
    return {
      id: source + '_' + songId,
      name: item.title || item.name || '',
      singer: item.artist || item.singer || item.artists || '',
      source,
      songmid: String(songId),
      interval: item.durationText || item.interval || normalizeInterval(item.duration),
      img: item.artwork || item.picUrl || item.cover || item.pic || null,
      albumName: item.album || item.albumName || '',
      lrc: null,
      otherSource: null,
      types: qualitys,
      _types: qualitys,
      typeUrl: {},
      rawMusicFreeItem: item,
    }
  }
  const normalizeSearch = (result, source, page, limit) => {
    const rawList = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.list)
          ? result.list
          : []
    const list = rawList.map((item, index) => normalizeSearchItem(item, index))
    const total = Number(result?.total ?? (result?.isEnd ? list.length : page * limit + list.length))
    const allPage = result?.isEnd ? page : Math.max(page + 1, Math.ceil(total / limit))
    return {
      list,
      total,
      limit,
      allPage,
      source,
    }
  }

  lx.on(lx.EVENT_NAMES.request, async ({ source, action, info }) => {
    const musicItem = normalizeMusicItem(info.musicInfo || {}, source || platform)
    switch (action) {
      case 'search':
        return normalizeSearch(await plugin.search(info.query, info.page, info.searchType || 'music'), source || platform, info.page, info.limit)
      case 'musicUrl':
        return normalizeUrl(await plugin.getMediaSource(musicItem.rawMusicFreeItem || musicItem, normalizeQuality(info.type)))
      case 'lyric':
        return normalizeLyric(await plugin.getLyric(musicItem.rawMusicFreeItem || musicItem))
      case 'pic':
        return normalizePic(await plugin.getMusicInfo(musicItem.rawMusicFreeItem || musicItem))
      default:
        throw new Error('Unsupported action: ' + action)
    }
  })

  lx.send(lx.EVENT_NAMES.inited, {
    sources: {
      [platform]: {
        name: plugin.platform || platform,
        type: 'music',
        actions,
        qualitys: ['128k', '320k', 'flac', 'flac24bit'],
      },
    },
  })
})()
`
}

export const parseIsPlusScript = (script: string) => {
  if (isPlusPluginScript(script)) return wrapPlusPluginScript(script)
  throw new Error('只支持导入 Is Plus/MusicFree 插件')
}
