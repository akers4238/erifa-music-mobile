import { action, state } from '@/store/userApi'
import { addUserApi, getUserApiScript, removeUserApi as removeUserApiFromStore, setUserApiAllowShowUpdateAlert as setUserApiAllowShowUpdateAlertFromStore } from '@/utils/data'
import { destroy, loadScript } from '@/utils/nativeModules/userApi'
import { log as writeLog } from '@/utils/log'

const isMusicFreePluginScript = (script: string) => {
  return /\bplatform\s*:/.test(script) &&
    /\bgetMediaSource\s*:|\bgetMediaSource\s*\(/.test(script) &&
    (/\bmodule\.exports\b/.test(script) || /\bexports\./.test(script) || /\bexport\s+default\b/.test(script))
}

const normalizeMusicFreePluginScript = (script: string) => {
  return script.replace(/\bexport\s+default\b/, 'module.exports.default =')
}

const wrapMusicFreePluginScript = (script: string) => {
  const pluginCode = normalizeMusicFreePluginScript(script)
  return `/*
 * @name MusicFree Plugin Adapter
 * @description MusicFree plugin compatibility wrapper
 * @author MusicFree
 * @version 1.0.0
 */
(() => {
  const module = { exports: {} }
  const exports = module.exports

  const request = (url, options = {}) => new Promise((resolve, reject) => {
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

  const require = (name) => {
    if (name === 'axios') return axios
    throw new Error('Unsupported MusicFree require: ' + name)
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
  if (!plugin || typeof plugin !== 'object') throw new Error('Invalid MusicFree plugin')

  const platform = String(plugin.platform || lx.currentScriptInfo.name || 'musicfree')
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
        return normalizeUrl(await plugin.getMediaSource(musicItem.rawMusicFreeItem || musicItem, info.type))
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

const normalizeImportedScript = (script: string) => {
  if (isMusicFreePluginScript(script)) return wrapMusicFreePluginScript(script)
  throw new Error('只支持导入 MusicFree 插件')
}


export const setUserApi = async(apiId: string) => {
  global.lx.qualityList = {}
  setUserApiStatus(false, 'initing')

  const target = state.list.find(api => api.id === apiId)
  if (!target) throw new Error('api not found')
  const script = await getUserApiScript(target.id)
  loadScript({ ...target, script })
}

export const destroyUserApi = () => {
  destroy()
}


export const setUserApiStatus: typeof action['setStatus'] = (status, message) => {
  action.setStatus(status, message)
}

export const setUserApiList: typeof action['setUserApiList'] = (list) => {
  action.setUserApiList(list)
}

export const importUserApi = async(script: string) => {
  const info = await addUserApi(normalizeImportedScript(script))
  action.addUserApi(info)
}

export const removeUserApi = async(ids: string[]) => {
  const list = await removeUserApiFromStore(ids)
  action.setUserApiList(list)
}

export const setUserApiAllowShowUpdateAlert = async(id: string, enable: boolean) => {
  await setUserApiAllowShowUpdateAlertFromStore(id, enable)
  action.setUserApiAllowShowUpdateAlert(id, enable)
}

export const log = {
  r_info(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.info(...params)
  },
  r_warn(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.warn(...params)
  },
  r_error(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.error(...params)
  },
  log(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  info(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  warn(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.warn(...params)
  },
  error(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.error(...params)
  },
}
