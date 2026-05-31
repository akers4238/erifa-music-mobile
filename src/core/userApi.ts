import { action, state } from '@/store/userApi'
import { addUserApi, getUserApiScript, removeUserApi as removeUserApiFromStore, setUserApiAllowShowUpdateAlert as setUserApiAllowShowUpdateAlertFromStore } from '@/utils/data'
import { destroy, loadScript } from '@/utils/nativeModules/userApi'
import { log as writeLog } from '@/utils/log'

const isLXUserApiScript = (script: string) => /\blx\.(?:on|send)\s*\(/.test(script)

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

  lx.on(lx.EVENT_NAMES.request, async ({ source, action, info }) => {
    const musicItem = normalizeMusicItem(info.musicInfo || {}, source || platform)
    switch (action) {
      case 'musicUrl':
        return normalizeUrl(await plugin.getMediaSource(musicItem, info.type))
      case 'lyric':
        return normalizeLyric(await plugin.getLyric(musicItem))
      case 'pic':
        return normalizePic(await plugin.getMusicInfo(musicItem))
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
  if (isLXUserApiScript(script)) return script
  if (isMusicFreePluginScript(script)) return wrapMusicFreePluginScript(script)
  return script
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
