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
  const utf8Bytes = (input) => {
    const str = String(input)
    const bytes = []
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i)
      if (code < 0x80) {
        bytes.push(code)
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
      } else if (code >= 0xd800 && code <= 0xdbff) {
        const next = str.charCodeAt(++i)
        code = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff))
        bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
      } else {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
      }
    }
    return bytes
  }
  const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits))
  const sha256Bytes = (input) => {
    const k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]
    const bytes = Array.isArray(input) ? input.slice() : utf8Bytes(input)
    const bitLength = bytes.length * 8
    bytes.push(0x80)
    while (bytes.length % 64 !== 56) bytes.push(0)
    for (let i = 7; i >= 0; i--) bytes.push((bitLength / Math.pow(2, i * 8)) & 0xff)
    const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
    const words = new Array(64)
    for (let offset = 0; offset < bytes.length; offset += 64) {
      for (let i = 0; i < 16; i++) {
        words[i] = ((bytes[offset + i * 4] << 24) | (bytes[offset + i * 4 + 1] << 16) | (bytes[offset + i * 4 + 2] << 8) | bytes[offset + i * 4 + 3]) >>> 0
      }
      for (let i = 16; i < 64; i++) {
        const s0 = (rotr(words[i - 15], 7) ^ rotr(words[i - 15], 18) ^ (words[i - 15] >>> 3)) >>> 0
        const s1 = (rotr(words[i - 2], 17) ^ rotr(words[i - 2], 19) ^ (words[i - 2] >>> 10)) >>> 0
        words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0
      }
      let [a, b, c, d, e, f, g, h] = hash
      for (let i = 0; i < 64; i++) {
        const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0
        const ch = ((e & f) ^ (~e & g)) >>> 0
        const temp1 = (h + s1 + ch + k[i] + words[i]) >>> 0
        const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0
        const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0
        const temp2 = (s0 + maj) >>> 0
        h = g
        g = f
        f = e
        e = (d + temp1) >>> 0
        d = c
        c = b
        b = a
        a = (temp1 + temp2) >>> 0
      }
      hash[0] = (hash[0] + a) >>> 0
      hash[1] = (hash[1] + b) >>> 0
      hash[2] = (hash[2] + c) >>> 0
      hash[3] = (hash[3] + d) >>> 0
      hash[4] = (hash[4] + e) >>> 0
      hash[5] = (hash[5] + f) >>> 0
      hash[6] = (hash[6] + g) >>> 0
      hash[7] = (hash[7] + h) >>> 0
    }
    const out = []
    for (const word of hash) out.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff)
    return out
  }
  const bytesToHex = bytes => bytes.map(byte => byte.toString(16).padStart(2, '0')).join('')
  const hmacSha256Hex = (message, key) => {
    let keyBytes = utf8Bytes(key)
    if (keyBytes.length > 64) keyBytes = sha256Bytes(keyBytes)
    while (keyBytes.length < 64) keyBytes.push(0)
    const outer = keyBytes.map(byte => byte ^ 0x5c)
    const inner = keyBytes.map(byte => byte ^ 0x36)
    return bytesToHex(sha256Bytes([...outer, ...sha256Bytes([...inner, ...utf8Bytes(message)])]))
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
    HmacSHA256(message, key) {
      return {
        toString() {
          return hmacSha256Hex(message, key)
        },
      }
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
  if (typeof plugin.getAlbumInfo === 'function') actions.push('albumInfo', 'musicSheetInfo')
  if (typeof plugin.getArtistWorks === 'function') actions.push('artistWorks')
  if (typeof plugin.getMusicSheetInfo === 'function') actions.push('musicSheetInfo')
  if (typeof plugin.importMusicSheet === 'function') actions.push('importMusicSheet')
  if (typeof plugin.getRecommendSheetTags === 'function') actions.push('recommendSheetTags')
  if (typeof plugin.getRecommendSheetsByTag === 'function') actions.push('recommendSheetsByTag')
  if (typeof plugin.getTopLists === 'function') actions.push('topLists')
  if (typeof plugin.getTopListDetail === 'function') actions.push('topListDetail')
  if (typeof plugin.getMusicComments === 'function') actions.push('musicComments')

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
  const encodePluginItem = (item, fallback) => {
    try {
      return encodeURIComponent(JSON.stringify(item))
    } catch (_) {
      return String(fallback)
    }
  }
  const decodePluginItem = (id) => {
    if (!id || typeof id !== 'string') return id
    const raw = id.startsWith(platform + '__mf__') ? id.slice((platform + '__mf__').length) : id
    try {
      return JSON.parse(decodeURIComponent(raw))
    } catch (_) {
      return id
    }
  }
  const normalizeSheetItem = (item, index) => {
    const sheetId = item.id || item.sheetId || item.albumId || item.aid || item.bvid || index
    return {
      id: platform + '__mf__' + encodePluginItem(item, sheetId),
      author: item.artist || item.author || item.creator || item.nickName || '',
      name: item.title || item.name || '',
      img: item.artwork || item.cover || item.pic || item.picUrl || null,
      desc: item.description || item.desc || item.subtitle || '',
      source: platform,
      total: item.musicList?.length ? String(item.musicList.length) : undefined,
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
  const normalizeSheetSearch = (result, source, page, limit) => {
    const rawList = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.list)
          ? result.list
          : []
    const list = rawList.map((item, index) => normalizeSheetItem(item, index))
    const total = Number(result?.total ?? (result?.isEnd ? list.length : page * limit + list.length))
    return {
      list,
      total,
      limit,
      source,
    }
  }
  const normalizeMusicList = (list) => (Array.isArray(list) ? list : []).map((item, index) => normalizeSearchItem(item, index))
  const normalizeMusicSheetInfo = (result, source, page, limit, id) => {
    const list = normalizeMusicList(result?.musicList || result?.data || result?.list || result)
    const total = Number(result?.total ?? list.length)
    return {
      list,
      source,
      total,
      page,
      limit,
      maxPage: Math.max(1, Math.ceil(total / limit)),
      key: null,
      id,
      info: {
        name: result?.title || result?.name || '',
        img: result?.artwork || result?.cover || result?.pic || '',
        desc: result?.description || result?.desc || '',
        author: result?.artist || result?.author || '',
      },
    }
  }
  const normalizeMusicFreeSearchType = (type) => {
    if (type === 'sheet' || type === 'songlist') return 'album'
    return type || 'music'
  }

  lx.on(lx.EVENT_NAMES.request, async ({ source, action, info }) => {
    const musicItem = normalizeMusicItem(info.musicInfo || {}, source || platform)
    switch (action) {
      case 'search':
        {
          const searchType = normalizeMusicFreeSearchType(info.searchType)
          const result = await plugin.search(info.query, info.page, searchType)
          return searchType === 'album'
            ? normalizeSheetSearch(result, source || platform, info.page, info.limit)
            : normalizeSearch(result, source || platform, info.page, info.limit)
        }
      case 'musicUrl':
        return normalizeUrl(await plugin.getMediaSource(musicItem.rawMusicFreeItem || musicItem, normalizeQuality(info.type)))
      case 'lyric':
        return normalizeLyric(await plugin.getLyric(musicItem.rawMusicFreeItem || musicItem))
      case 'pic':
        return normalizePic(await plugin.getMusicInfo(musicItem.rawMusicFreeItem || musicItem))
      case 'albumInfo':
        return plugin.getAlbumInfo(await decodePluginItem(info.albumInfo || info.id))
      case 'artistWorks':
        return plugin.getArtistWorks(await decodePluginItem(info.artistInfo || info.id), info.page, info.workType || info.type || 'music')
      case 'musicSheetInfo':
        {
          const item = decodePluginItem(info.sheetInfo || info.id)
          const result = typeof plugin.getMusicSheetInfo === 'function'
            ? await plugin.getMusicSheetInfo(item, info.page)
            : await plugin.getAlbumInfo(item, info.page)
          return normalizeMusicSheetInfo(result, source || platform, info.page || 1, info.limit || 30, info.id)
        }
      case 'importMusicSheet':
        return normalizeMusicList(await plugin.importMusicSheet(info.url || info.id || info.text))
      case 'recommendSheetTags':
        return plugin.getRecommendSheetTags()
      case 'recommendSheetsByTag':
        return plugin.getRecommendSheetsByTag(info.tag, info.page)
      case 'topLists':
        return plugin.getTopLists()
      case 'topListDetail':
        return normalizeMusicSheetInfo(await plugin.getTopListDetail(info.topListInfo || info.id, info.page), source || platform, info.page || 1, info.limit || 30, info.id)
      case 'musicComments':
        return plugin.getMusicComments(musicItem.rawMusicFreeItem || musicItem, info.page, info.sortType)
      default:
        throw new Error('Unsupported action: ' + action)
    }
  })

  lx.send(lx.EVENT_NAMES.inited, {
    sources: {
      [platform]: {
        name: plugin.platform || platform,
        type: 'music',
        actions: Array.from(new Set(actions)),
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
