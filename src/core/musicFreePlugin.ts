import * as he from 'he'
import { stringMd5 } from 'react-native-quick-md5'
import { version } from '../../package.json'
import musicSdk from '@/utils/musicSdk'
import { fetchData } from '@/core/init/userApi/request'
import searchMusicState from '@/store/search/music/state'
import searchSonglistState from '@/store/search/songlist/state'
import searchState from '@/store/search/state'
import leaderboardState from '@/store/leaderboard/state'
import songlistState from '@/store/songlist/state'
import commonActions from '@/store/common/action'
import { getUserApiList, getUserApiScript } from '@/utils/data'

type MusicFreeSearchType = 'music' | 'album' | 'sheet' | 'artist'
type MusicFreeQuality = 'low' | 'standard' | 'high' | 'super' | LX.Quality
const musicFreeQualityFallbacks: MusicFreeQuality[] = ['standard', 'high', 'super', 'low', '320k', 'flac', 'flac24bit', '128k']
const youtubeUserAgent = 'com.google.android.apps.youtube.music/6.14.50 (Linux; U; Android 13) gzip'
type MusicFreeCacheControl = 'cache' | 'no-cache' | 'no-store'

interface MusicFreeUserVariable {
  key: string
  name?: string
  hint?: string
}

interface MusicFreePluginDefine {
  platform: string
  appVersion?: string
  version?: string
  srcUrl?: string
  author?: string
  description?: string
  primaryKey?: string[]
  cacheControl?: MusicFreeCacheControl
  userVariables?: MusicFreeUserVariable[]
  hints?: Record<string, string[]>
  supportedSearchType?: MusicFreeSearchType[]
  defaultSearchType?: MusicFreeSearchType
  search?: (query: string, page: number, type: MusicFreeSearchType) => Promise<any>
  getMediaSource?: (musicItem: any, quality: MusicFreeQuality) => Promise<any>
  getMusicInfo?: (musicItem: any) => Promise<any>
  getLyric?: (musicItem: any) => Promise<any>
  getAlbumInfo?: (albumItem: any, page: number) => Promise<any>
  getArtistWorks?: (artistItem: any, page: number, type: string) => Promise<any>
  getMusicSheetInfo?: (sheetItem: any, page: number) => Promise<any>
  importMusicSheet?: (urlLike: string) => Promise<any>
  importMusicItem?: (urlLike: string) => Promise<any>
  getRecommendSheetTags?: () => Promise<any>
  getRecommendSheetsByTag?: (tag: any, page?: number) => Promise<any>
  getTopLists?: () => Promise<any>
  getTopListDetail?: (topListItem: any, page: number) => Promise<any>
  getMusicComments?: (musicItem: any, page?: number) => Promise<any>
  [key: string]: any
}

export interface MusicFreePlugin {
  id: string
  name: string
  info: LX.UserApi.UserApiInfo
  instance: MusicFreePluginDefine
  supportedMethods: Set<string>
}

const appendParams = (url: string, params?: Record<string, any>) => {
  if (!params || typeof params !== 'object') return url
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  if (!query) return url
  return `${url}${url.includes('?') ? '&' : '?'}${query}`
}

const request = async(url: string, options: Record<string, any> = {}) => {
  const targetUrl = appendParams(url, options.params)
  const resp = await fetchData(targetUrl, {
    method: options.method ?? 'get',
    timeout: options.timeout,
    headers: options.headers,
    body: options.data ?? options.body,
    form: options.form,
    formData: options.formData,
    binary: options.responseType === 'arraybuffer' || options.binary === true,
  }).request
  return {
    data: resp.body,
    status: resp.statusCode,
    statusText: resp.statusMessage,
    headers: resp.headers,
    body: resp.body,
  }
}

const axios: any = (configOrUrl: string | Record<string, any>, config: Record<string, any> = {}) => {
  const options = typeof configOrUrl === 'string'
    ? { ...config, url: configOrUrl }
    : configOrUrl
  return request(options.url, options)
}
axios.get = (url: string, config: Record<string, any> = {}) => request(url, { ...config, method: 'get' })
axios.post = (url: string, data?: any, config: Record<string, any> = {}) => request(url, { ...config, method: 'post', data })
axios.default = axios

const pad2 = (value: number) => String(value).padStart(2, '0')
const dayjs: any = (value?: any) => {
  const date = value == null ? new Date() : new Date(value)
  return {
    format(format = 'YYYY-MM-DD HH:mm:ss') {
      const values: Record<string, string> = {
        YYYY: String(date.getFullYear()),
        MM: pad2(date.getMonth() + 1),
        DD: pad2(date.getDate()),
        HH: pad2(date.getHours()),
        mm: pad2(date.getMinutes()),
        ss: pad2(date.getSeconds()),
      }
      return format.replace(/YYYY|MM|DD|HH|mm|ss/g, key => values[key])
    },
    valueOf() {
      return date.getTime()
    },
    toDate() {
      return date
    },
  }
}
dayjs.unix = (value: number) => dayjs(Number(value || 0) * 1000)

const cheerio = {
  load(html = '') {
    return (selector: string) => ({
      text() {
        if (selector === '#__RENDER_DATA__') {
          const match = String(html).match(/<script[^>]+id=["']__RENDER_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
          return match ? match[1] : ''
        }
        return ''
      },
    })
  },
}

const utf8Bytes = (input: any) => {
  const str = String(input)
  const bytes: number[] = []
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
const rotr = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits))
const sha256Bytes = (input: any) => {
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
  const out: number[] = []
  for (const word of hash) out.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff)
  return out
}
const bytesToHex = (bytes: number[]) => bytes.map(byte => byte.toString(16).padStart(2, '0')).join('')
const hmacSha256Hex = (message: any, key: any) => {
  let keyBytes = utf8Bytes(key)
  if (keyBytes.length > 64) keyBytes = sha256Bytes(keyBytes)
  while (keyBytes.length < 64) keyBytes.push(0)
  const outer = keyBytes.map(byte => byte ^ 0x5c)
  const inner = keyBytes.map(byte => byte ^ 0x36)
  return bytesToHex(sha256Bytes([...outer, ...sha256Bytes([...inner, ...utf8Bytes(message)])]))
}
const hashWord = (hex: string) => ({
  toString() {
    return hex
  },
})
const cryptoJs = {
  enc: {
    Hex: 'hex',
    Utf8: 'utf8',
  },
  MD5(value: any) {
    return hashWord(stringMd5(String(value)))
  },
  SHA256(value: any) {
    return hashWord(bytesToHex(sha256Bytes(value)))
  },
  HmacSHA256(message: any, key: any) {
    return hashWord(hmacSha256Hex(message, key))
  },
}

const qs = {
  stringify(params: Record<string, any> = {}) {
    return Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .flatMap(([key, value]) => Array.isArray(value)
        ? value.map(item => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`)
        : [`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`])
      .join('&')
  },
  parse(value = '') {
    const result: Record<string, string> = {}
    const query = String(value).replace(/^\?/, '')
    for (const pair of query.split('&')) {
      if (!pair) continue
      const [key, ...rest] = pair.split('=')
      result[decodeURIComponent(key)] = decodeURIComponent(rest.join('=') || '')
    }
    return result
  },
}

const compareParts = (current: string, target: string) => {
  const left = String(current).split(/[.-]/)
  const right = String(target).split(/[.-]/)
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i++) {
    const l = Number(left[i] || 0)
    const r = Number(right[i] || 0)
    if (Number.isNaN(l) || Number.isNaN(r)) {
      const result = String(left[i] || '').localeCompare(String(right[i] || ''))
      if (result) return result > 0 ? 1 : -1
    } else if (l !== r) {
      return l > r ? 1 : -1
    }
  }
  return 0
}
const compareVersions = {
  compare(current: string, target: string, operator = '=') {
    const result = compareParts(current, target)
    switch (operator) {
      case '>': return result > 0
      case '>=': return result >= 0
      case '<': return result < 0
      case '<=': return result <= 0
      case '!=':
      case '!==': return result !== 0
      default: return result === 0
    }
  },
  satisfies(versionValue: string, range = '') {
    const match = String(range).trim().match(/^(>=|<=|>|<|=|\^|~)?\s*(.+)$/)
    if (!match) return true
    const operator = match[1] || '>='
    return compareVersions.compare(versionValue, match[2], operator === '^' || operator === '~' ? '>=' : operator)
  },
  compareVersions: compareParts,
}

const getPathParts = (path: string | Array<string | number>) => Array.isArray(path) ? path : String(path).split('.').filter(Boolean)
const objectPath = {
  get(target: any, path: string | Array<string | number>, defaultValue?: any) {
    let current = target
    for (const key of getPathParts(path)) {
      if (current == null || current[key as keyof typeof current] == null) return defaultValue
      current = current[key as keyof typeof current]
    }
    return current
  },
  set(target: any, path: string | Array<string | number>, value: any) {
    const parts = getPathParts(path)
    let current = target
    parts.forEach((key, index) => {
      if (index === parts.length - 1) {
        current[key as keyof typeof current] = value
      } else {
        current[key as keyof typeof current] ??= {}
        current = current[key as keyof typeof current]
      }
    })
    return target
  },
  has(target: any, path: string | Array<string | number>) {
    return objectPath.get(target, path) !== undefined
  },
  del(target: any, path: string | Array<string | number>) {
    const parts = getPathParts(path)
    const last = parts.pop()
    const parent = parts.length ? objectPath.get(target, parts) : target
    if (parent && last != null) delete parent[last as keyof typeof parent]
  },
}

const bigInteger = (value: any = 0) => {
  const current = BigInt(String(value || 0))
  const wrap = (next: bigint) => bigInteger(next.toString())
  return {
    add: (next: any) => wrap(current + BigInt(String(next || 0))),
    subtract: (next: any) => wrap(current - BigInt(String(next || 0))),
    minus: (next: any) => wrap(current - BigInt(String(next || 0))),
    multiply: (next: any) => wrap(current * BigInt(String(next || 0))),
    divide: (next: any) => wrap(current / BigInt(String(next || 1))),
    mod: (next: any) => wrap(current % BigInt(String(next || 1))),
    equals: (next: any) => current === BigInt(String(next || 0)),
    compare: (next: any) => current > BigInt(String(next || 0)) ? 1 : current < BigInt(String(next || 0)) ? -1 : 0,
    greater: (next: any) => current > BigInt(String(next || 0)),
    lesser: (next: any) => current < BigInt(String(next || 0)),
    toJSNumber: () => Number(current),
    toString: (radix?: number) => current.toString(radix),
    valueOf: () => Number(current),
  }
}

const nanoid = {
  nanoid(size = 21) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-'
    let id = ''
    for (let i = 0; i < size; i++) id += chars[Math.floor(Math.random() * chars.length)]
    return id
  },
}

const cookieManager = {
  get: async() => ({}),
  set: async() => true,
  clearAll: async() => true,
  flush: async() => true,
}

const withDefault = <T>(pkg: T): T => {
  if (pkg && (typeof pkg === 'object' || typeof pkg === 'function') && !(pkg as any).default) {
    try {
      ;(pkg as any).default = pkg
    } catch {
      return { ...(pkg as any), default: pkg } as T
    }
  }
  return pkg
}

const pluginRequire = (name: string) => {
  switch (name) {
    case 'axios':
      return withDefault(axios)
    case 'dayjs':
      return withDefault(dayjs)
    case 'he':
      return withDefault(he)
    case 'cheerio':
      return withDefault(cheerio)
    case 'crypto-js':
      return withDefault(cryptoJs)
    case 'qs':
      return withDefault(qs)
    case 'compare-versions':
      return withDefault(compareVersions)
    case 'object-path':
      return withDefault(objectPath)
    case 'big-integer':
      return withDefault(bigInteger)
    case 'nanoid':
      return withDefault(nanoid)
    case '@react-native-cookies/cookies':
      return withDefault(cookieManager)
    default:
      throw new Error(`Unsupported plugin require: ${name}`)
  }
}

const normalizeModuleSyntax = (script: string) => {
  return script.replace(/\bexport\s+default\b/, 'module.exports.default =')
}

const normalizeUserVariables = (variables: any): MusicFreeUserVariable[] | undefined => {
  if (!Array.isArray(variables)) return undefined
  const normalized = variables
    .filter(item => item && typeof item === 'object' && typeof item.key === 'string' && item.key.trim())
    .map(item => ({
      key: item.key.trim(),
      name: typeof item.name === 'string' ? item.name : undefined,
      hint: typeof item.hint === 'string' ? item.hint : undefined,
    }))
  return normalized.length ? normalized : undefined
}

export const mountMusicFreePlugin = (script: string, info?: Partial<LX.UserApi.UserApiInfo>): MusicFreePlugin => {
  const module = { exports: {} as any }
  const userVariablesValue = info?.userVariablesValue ?? {}
  const env = {
    appVersion: version,
    os: 'android',
    lang: 'zh-CN',
    getUserVariables() {
      return { ...userVariablesValue }
    },
    get userVariables() {
      return { ...userVariablesValue }
    },
  }
  const processShim = {
    platform: 'android',
    version,
    env,
  }
  const code = normalizeModuleSyntax(script)
  const result = Function(`
    'use strict';
    return function(require, __musicfree_require, module, exports, console, env, URL, process) {
      ${code}
    }
  `)()(
    pluginRequire,
    pluginRequire,
    module,
    module.exports,
    console,
    env,
    URL,
    processShim,
  )
  const instance = module.exports?.default
    ? module.exports.default
    : Object.keys(module.exports ?? {}).length
      ? module.exports
      : result

  if (!instance || typeof instance !== 'object' || !instance.platform) {
    throw new Error('Invalid MusicFree plugin')
  }

  const supportedMethods = new Set(
    Object.keys(instance).filter(key => typeof instance[key] === 'function'),
  )
  const name = String(instance.platform)
  const id = info?.id || `user_api_${stringMd5(name).slice(0, 16)}`

  return {
    id,
    name,
    instance,
    supportedMethods,
    info: {
      id,
      name: info?.name || name,
      description: info?.description ?? instance.description ?? '',
      allowShowUpdateAlert: info?.allowShowUpdateAlert ?? true,
      author: info?.author ?? instance.author ?? '',
      homepage: info?.homepage ?? instance.srcUrl ?? '',
      version: info?.version ?? instance.version ?? '',
      userVariables: normalizeUserVariables(instance.userVariables) ?? info?.userVariables,
      userVariablesValue,
      hints: instance.hints ?? info?.hints,
      sources: {
        [name]: {
          name,
          type: 'music',
          actions: getActions(instance),
          qualitys: ['128k', '320k', 'flac', 'flac24bit'],
        },
      } as any,
    },
  }
}

export const getMusicFreePluginInfo = (script: string): LX.UserApi.UserApiInfo => {
  return mountMusicFreePlugin(script).info
}

export const importMusicFreeItem = async(info: LX.UserApi.UserApiInfo, script: string, urlLike: string) => {
  const plugin = mountMusicFreePlugin(script, info)
  if (typeof plugin.instance.importMusicItem !== 'function') return null
  const result = await plugin.instance.importMusicItem(urlLike)
  return normalizeImportedMusicList(plugin.name, result)[0] ?? null
}

export const importMusicFreeSheet = async(info: LX.UserApi.UserApiInfo, script: string, urlLike: string) => {
  const plugin = mountMusicFreePlugin(script, info)
  if (typeof plugin.instance.importMusicSheet !== 'function') return []
  const result = await plugin.instance.importMusicSheet(urlLike)
  return normalizeImportedMusicList(plugin.name, result)
}

const getActions = (plugin: MusicFreePluginDefine): LX.UserApi.UserApiSourceInfoActions[] => {
  const actions: LX.UserApi.UserApiSourceInfoActions[] = ['musicUrl']
  if (typeof plugin.search === 'function') actions.push('search')
  if (typeof plugin.getLyric === 'function') actions.push('lyric')
  if (typeof plugin.getMusicInfo === 'function') actions.push('pic')
  if (typeof plugin.getAlbumInfo === 'function') actions.push('albumInfo', 'musicSheetInfo')
  if (typeof plugin.getArtistWorks === 'function') actions.push('artistWorks')
  if (typeof plugin.getMusicSheetInfo === 'function') actions.push('musicSheetInfo')
  if (typeof plugin.importMusicItem === 'function') actions.push('importMusicItem')
  if (typeof plugin.importMusicSheet === 'function') actions.push('importMusicSheet')
  if (typeof plugin.getRecommendSheetTags === 'function') actions.push('recommendSheetTags')
  if (typeof plugin.getRecommendSheetsByTag === 'function') actions.push('recommendSheetsByTag')
  if (typeof plugin.getTopLists === 'function') actions.push('topLists')
  if (typeof plugin.getTopListDetail === 'function') actions.push('topListDetail')
  if (typeof plugin.getMusicComments === 'function') actions.push('musicComments')
  return Array.from(new Set(actions))
}

const normalizeQuality = (quality: LX.Quality): MusicFreeQuality => {
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
      return quality
  }
}

const normalizeInterval = (value: any) => {
  const duration = Number(value || 0)
  if (!duration) return null
  const seconds = duration > 1000 ? Math.round(duration / 1000) : Math.round(duration)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const normalizeSinger = (value: any) => {
  if (Array.isArray(value)) {
    return value.map(item => typeof item === 'string' ? item : item?.name || item?.title || '').filter(Boolean).join(' / ')
  }
  return value || ''
}
const normalizeQualitys = (item: any): LX.Quality[] => {
  const candidates = item.qualities || item.qualitys || {}
  if (Array.isArray(candidates)) {
    const qualitys = candidates.map(q => typeof q === 'string' ? q : q?.type).filter(Boolean)
    return qualitys.length ? qualitys as LX.Quality[] : ['128k', '320k', 'flac', 'flac24bit']
  }
  if (candidates && typeof candidates === 'object') {
    const qualitys = Object.keys(candidates)
    return qualitys.length ? qualitys as LX.Quality[] : ['128k', '320k', 'flac', 'flac24bit']
  }
  return ['128k', '320k', 'flac', 'flac24bit']
}

const encodePluginItem = (item: any, fallback: any) => {
  try {
    return encodeURIComponent(JSON.stringify(item))
  } catch {
    return String(fallback)
  }
}

const decodePluginItem = (platform: string, id: any) => {
  if (!id || typeof id !== 'string') return id
  const prefix = `${platform}__mf__`
  const sourcePrefix = `${platform}__`
  const raw = id.startsWith(prefix)
    ? id.slice(prefix.length)
    : id.startsWith(sourcePrefix)
      ? id.slice(sourcePrefix.length)
      : id
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return raw
  }
}

const normalizeMusicInfo = (platform: string, item: any, index: number): LX.Music.MusicInfoOnline => {
  const songId = item.id || item.songId || item.songmid || item.hash || index
  const qualitys = normalizeQualitys(item)
  const qualityMap = qualitys.reduce<Record<string, { size: null }>>((map, type) => {
    map[type] = { size: null }
    return map
  }, {})
  return {
    name: item.title || item.name || '',
    singer: normalizeSinger(item.artist || item.singer || item.artists),
    source: platform as any,
    songmid: String(songId),
    interval: item.durationText || item.interval || normalizeInterval(item.duration),
    albumName: item.album || item.albumName || '',
    img: item.artwork || item.picUrl || item.cover || item.pic || null,
    types: qualitys.map(type => ({ type, size: null })),
    _types: qualityMap,
    typeUrl: {},
    rawMusicFreeItem: item,
  } as any
}

const normalizeSearch = (platform: string, result: any, page: number, limit: number) => {
  const rawList = Array.isArray(result)
    ? result
    : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.list)
        ? result.list
        : []
  const list = rawList.map((item: any, index: number) => normalizeMusicInfo(platform, item, index))
  const total = Number(result?.total ?? (result?.isEnd ? list.length : page * limit + list.length))
  return {
    list,
    total,
    limit,
    allPage: result?.isEnd ? page : Math.max(page + 1, Math.ceil(total / limit)),
    source: platform,
  }
}

const normalizeImportedMusicList = (platform: string, result: any): LX.Music.MusicInfoOnline[] => {
  const rawList = Array.isArray(result)
    ? result
    : Array.isArray(result?.musicList)
      ? result.musicList
      : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.list)
          ? result.list
          : result ? [result] : []
  return rawList.map((item: any, index: number) => normalizeMusicInfo(platform, item, index))
}

const normalizeSheetItem = (platform: string, item: any, index: number) => {
  const sheetId = item.id || item.sheetId || item.albumId || item.aid || item.bvid || index
  return {
    id: `${platform}__mf__${encodePluginItem(item, sheetId)}`,
    author: item.artist || item.author || item.creator || item.nickName || '',
    name: item.title || item.name || '',
    img: item.artwork || item.cover || item.pic || item.picUrl || null,
    desc: item.description || item.desc || item.subtitle || '',
    source: platform,
    total: item.musicList?.length ? String(item.musicList.length) : undefined,
    rawMusicFreeItem: item,
  }
}

const normalizeSheetSearch = (platform: string, result: any, page: number, limit: number) => {
  const rawList = Array.isArray(result)
    ? result
    : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.list)
        ? result.list
        : []
  return {
    list: rawList.map((item: any, index: number) => normalizeSheetItem(platform, item, index)),
    total: Number(result?.total ?? rawList.length),
    limit,
    source: platform,
  }
}

const normalizeTags = (platform: string, result: any) => {
  const groups = Array.isArray(result)
    ? result
    : Array.isArray(result?.data)
      ? result.data
      : []
  const tags = groups.map((group: any, groupIndex: number) => {
    const list = Array.isArray(group?.data)
      ? group.data
      : Array.isArray(group?.list)
        ? group.list
        : Array.isArray(group)
          ? group
          : [group]
    const parentName = group?.title || group?.name || 'Default'
    return {
      name: parentName,
      list: list.map((item: any, index: number) => ({
        parent_id: String(group?.id || groupIndex),
        parent_name: parentName,
        id: `${platform}__mf__${encodePluginItem(item, item.id || item.title || item.name || index)}`,
        name: item.title || item.name || '',
        source: platform,
        rawMusicFreeItem: item,
      })),
    }
  })
  return {
    source: platform as any,
    tags,
    hotTag: tags.flatMap((group: any) => group.list).slice(0, 10),
  }
}

const normalizeRecommendSheets = (platform: string, result: any, page: number, limit: number, tagId: string, sortId: string) => {
  const base = normalizeSheetSearch(platform, result, page, limit)
  const total = Number(result?.total ?? base.total)
  return {
    ...base,
    page,
    maxPage: result?.isEnd ? page : Math.max(page + 1, Math.ceil(total / limit)),
    key: null,
    tagId,
    sortId,
  }
}

const normalizeMusicSheetInfo = (platform: string, result: any, page: number, limit: number, id: string) => {
  const list = (Array.isArray(result?.musicList) ? result.musicList : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [])
    .map((item: any, index: number) => normalizeMusicInfo(platform, item, index))
  const total = Number(result?.total ?? list.length)
  const sheetItem = result?.sheetItem || result?.albumItem || result || {}
  return {
    list,
    source: platform,
    total,
    page,
    limit,
    maxPage: Math.max(1, Math.ceil(total / limit)),
    key: null,
    id,
    info: {
      name: sheetItem.title || sheetItem.name || '',
      img: sheetItem.artwork || sheetItem.cover || sheetItem.pic || '',
      desc: sheetItem.description || sheetItem.desc || '',
      author: sheetItem.artist || sheetItem.author || '',
    },
  }
}

const normalizeTopLists = (platform: string, result: any) => {
  const groups = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : []
  const list = groups.flatMap((group: any, groupIndex: number) => {
    const items = Array.isArray(group?.data)
      ? group.data
      : Array.isArray(group?.list)
        ? group.list
        : Array.isArray(group)
          ? group
          : [group]
    return items.map((item: any, index: number) => {
      const id = item.id || item.sheetId || item.topListId || `${groupIndex}_${index}`
      return {
        id: `${platform}__${encodePluginItem(item, id)}`,
        bangid: `${platform}__${encodePluginItem(item, id)}`,
        name: item.title || item.name || group?.title || group?.name || '',
      }
    })
  })
  return {
    source: platform as any,
    list,
  }
}

const getSheetSearchType = (plugin: MusicFreePluginDefine): MusicFreeSearchType => {
  if (plugin.supportedSearchType?.includes('sheet')) return 'sheet'
  return 'album'
}

const getMusicSearchType = (plugin: MusicFreePluginDefine): MusicFreeSearchType => {
  if (plugin.defaultSearchType && plugin.supportedSearchType?.includes(plugin.defaultSearchType)) return plugin.defaultSearchType
  if (!plugin.supportedSearchType?.length || plugin.supportedSearchType.includes('music')) return 'music'
  return plugin.supportedSearchType[0]
}

const normalizeLyric = (result: any) => {
  if (typeof result === 'string') return { lyric: result }
  if (!result || typeof result !== 'object') return { lyric: '' }
  return {
    lyric: result.lyric || result.rawLrc || result.lrc || '',
    tlyric: result.tlyric || result.translation || null,
    rlyric: result.rlyric || result.romaLrc || null,
    lxlyric: result.lxlyric || null,
  }
}

const normalizeComment = (item: any, index: number) => ({
  id: String(item.id || item.commentId || item.cid || index),
  text: item.text || item.content || item.commentInfo || '',
  images: item.images || item.pictures || undefined,
  location: item.location,
  timeStr: item.timeStr || item.time || item.date || '',
  userName: item.userName || item.nickname || item.nickName || item.user?.nickname || item.user?.name || '',
  avatar: item.avatar || item.avatarUrl || item.user?.avatarUrl || item.user?.avatar,
  userId: item.userId || item.user?.id,
  likedCount: item.likedCount || item.likeCount || item.liked || 0,
  replyNum: item.replyNum || item.replyCount || 0,
  reply: Array.isArray(item.reply)
    ? item.reply.map((reply: any, replyIndex: number) => normalizeComment(reply, replyIndex))
    : [],
})

const normalizeComments = (platform: string, result: any, page: number, limit: number) => {
  const rawList = Array.isArray(result)
    ? result
    : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result?.comments)
        ? result.comments
        : []
  const total = Number(result?.total ?? rawList.length)
  return {
    source: platform as any,
    comments: rawList.map(normalizeComment),
    total,
    page,
    limit,
    maxPage: Math.max(1, Math.ceil(total / limit)),
  }
}

const normalizeUrl = (result: any) => {
  if (typeof result === 'string') return result
  if (result && typeof result.url === 'string') return result.url
  return ''
}
const isYoutubeSource = (platform: string, sourceName = '') => /youtube/i.test(platform) || /youtube/i.test(sourceName)

const withYoutubeHeaders = (resource: LX.Player.MusicResource, enable: boolean): LX.Player.MusicResource => {
  if (!enable || !resource.url) return resource
  return {
    ...resource,
    userAgent: resource.userAgent || youtubeUserAgent,
    headers: {
      Referer: 'https://music.youtube.com/',
      Origin: 'https://music.youtube.com',
      Range: 'bytes=0-',
      ...(resource.headers ?? {}),
    },
  }
}

const normalizeMediaSource = (result: any, fallbackUrl = '', youtube = false): LX.Player.MusicResource => {
  if (typeof result === 'string') return withYoutubeHeaders({ url: result }, youtube)
  const url = typeof result?.url === 'string' ? result.url : fallbackUrl
  const headers = result?.headers && typeof result.headers === 'object'
    ? Object.fromEntries(Object.entries(result.headers).map(([key, value]) => [key, String(value)]))
    : undefined
  const userAgent = typeof result?.userAgent === 'string'
    ? result.userAgent
    : headers?.['user-agent'] || headers?.['User-Agent']
  return withYoutubeHeaders({
    url,
    headers,
    userAgent,
  }, youtube)
}

const getFallbackUrl = (item: any, mfQuality: MusicFreeQuality, lxQuality: LX.Quality) => {
  return item?.qualities?.[mfQuality]?.url ||
    item?.qualities?.[lxQuality]?.url ||
    item?.qualitys?.[mfQuality]?.url ||
    item?.qualitys?.[lxQuality]?.url ||
    item?.url ||
    ''
}

const getPluginMediaSource = async(
  plugin: MusicFreePluginDefine,
  item: any,
  quality: LX.Quality,
  youtube = false,
): Promise<LX.Player.MusicResource> => {
  if (!plugin.getMediaSource) {
    return normalizeMediaSource(getFallbackUrl(item, normalizeQuality(quality), quality), '', youtube)
  }

  const firstQuality = normalizeQuality(quality)
  const qualities = [firstQuality, ...musicFreeQualityFallbacks.filter(q => q != firstQuality)]
  let lastResult: any
  for (const targetQuality of qualities) {
    try {
      const result = await plugin.getMediaSource(item, targetQuality)
      lastResult = result
      const resource = normalizeMediaSource(
        result,
        getFallbackUrl(item, targetQuality, quality),
        youtube,
      )
      if (resource.url) return resource
    } catch (err) {
      lastResult = err
    }
  }

  const fallback = normalizeMediaSource(
    lastResult,
    getFallbackUrl(item, firstQuality, quality),
    youtube,
  )
  if (fallback.url) return fallback
  throw new Error('Plugin did not return playable url')
}

const getRawMusicFreeItem = (musicInfo: any) => {
  const rawItem = musicInfo?.meta?.rawMusicFreeItem || musicInfo?.rawMusicFreeItem
  if (rawItem) return rawItem
  if (!musicInfo) return musicInfo
  return {
    ...musicInfo,
    id: musicInfo.meta?.songId ?? musicInfo.id,
    title: musicInfo.name,
    artist: musicInfo.singer,
    album: musicInfo.meta?.albumName,
    artwork: musicInfo.meta?.picUrl,
    platform: musicInfo.source,
  }
}

const getAlternativeMediaPlugin = async(info: LX.UserApi.UserApiInfo, fallbackPlugin: MusicFreePluginDefine) => {
  if (!info.alternativePluginId || info.alternativePluginId == info.id) return fallbackPlugin
  const alternativeInfo = (await getUserApiList()).find(api => api.id == info.alternativePluginId)
  if (!alternativeInfo) return fallbackPlugin
  const alternativeScript = await getUserApiScript(alternativeInfo.id)
  const alternativePlugin = mountMusicFreePlugin(alternativeScript, alternativeInfo)
  return typeof alternativePlugin.instance.getMediaSource === 'function'
    ? alternativePlugin.instance
    : fallbackPlugin
}

let activePlugin: MusicFreePlugin | null = null
const mountedPluginNames = new Set<string>()

export const destroyMusicFreePlugin = () => {
  for (const name of mountedPluginNames) delete (musicSdk as any)[name]
  mountedPluginNames.clear()
  activePlugin = null
}

export const getActiveMusicFreePlugin = () => activePlugin

const createSdkSource = (mounted: MusicFreePlugin) => {
  const platform = mounted.name as LX.OnlineSource
  const sourceName = mounted.info.name || mounted.name
  const plugin = mounted.instance
  const actions = getActions(plugin)
  const youtube = isYoutubeSource(mounted.name, sourceName)

  const sdkSource: any = {
    name: sourceName,
    id: platform,
    getMusicUrl(songInfo: LX.Music.MusicInfo, type: LX.Quality) {
      return {
        canceleFn() {},
        promise: getAlternativeMediaPlugin(mounted.info, plugin).then(parserPlugin => {
          return getPluginMediaSource(parserPlugin, getRawMusicFreeItem(songInfo), type, youtube)
            .then(resource => ({ type, ...resource }))
        }),
      }
    },
  }

  if (actions.includes('lyric')) {
    sdkSource.getLyric = (songInfo: LX.Music.MusicInfo) => ({
      canceleFn() {},
      promise: plugin.getLyric
        ? plugin.getLyric(getRawMusicFreeItem(songInfo)).then(normalizeLyric)
        : Promise.reject(new Error('Plugin does not support getLyric')),
    })
  }
  if (actions.includes('pic')) {
    sdkSource.getPic = (songInfo: LX.Music.MusicInfo) => ({
      canceleFn() {},
      promise: plugin.getMusicInfo
        ? plugin.getMusicInfo(getRawMusicFreeItem(songInfo)).then(result => result?.artwork || result?.cover || result?.pic || '')
        : Promise.reject(new Error('Plugin does not support getMusicInfo')),
    })
  }
  if (actions.includes('search')) {
    sdkSource.musicSearch = {
      search(text: string, page: number, limit = 30) {
        return plugin.search!(text, page, getMusicSearchType(plugin)).then(result => normalizeSearch(mounted.name, result, page, limit))
      },
    }
    sdkSource.tipSearch = {
      search(text: string) {
        return plugin.search!(text, 1, getMusicSearchType(plugin)).then(result => {
          const list = normalizeSearch(mounted.name, result, 1, 10).list
          return Array.from(new Set(list.map((item: LX.Music.MusicInfoOnline) => item.name).filter(Boolean))).slice(0, 10)
        })
      },
    }
    sdkSource.songList = {
      search(text: string, page: number, limit = 18) {
        return plugin.search!(text, page, getSheetSearchType(plugin)).then(result => normalizeSheetSearch(mounted.name, result, page, limit))
      },
    }
  }
  if (typeof plugin.getRecommendSheetTags === 'function' || typeof plugin.getRecommendSheetsByTag === 'function') {
    sdkSource.songList ||= {}
    sdkSource.songList.sortList = [{ name: 'Default', tid: 'recommend', id: 'default' }]
    sdkSource.songList.getTags = () => {
      return plugin.getRecommendSheetTags
        ? plugin.getRecommendSheetTags().then(result => normalizeTags(mounted.name, result))
        : Promise.resolve({
          source: mounted.name,
          tags: [{
            name: 'Default',
            list: [{
              parent_id: 'default',
              parent_name: 'Default',
              id: `${mounted.name}__mf__default`,
              name: 'Default',
              source: mounted.name,
            }],
          }],
          hotTag: [],
        })
    }
    sdkSource.songList.getList = (sortId = 'default', tagId = `${mounted.name}__mf__default`, page = 1, limit = 30) => {
      if (!plugin.getRecommendSheetsByTag) {
        return Promise.resolve({
          list: [],
          total: 0,
          page,
          limit,
          maxPage: 1,
          key: null,
          source: mounted.name,
          tagId,
          sortId,
        })
      }
      const tag = decodePluginItem(mounted.name, tagId)
      return plugin.getRecommendSheetsByTag(tag, page)
        .then(result => normalizeRecommendSheets(mounted.name, result, page, limit, tagId, sortId))
    }
  }
  if (sdkSource.songList && (typeof plugin.getMusicSheetInfo === 'function' || typeof plugin.getAlbumInfo === 'function')) {
    sdkSource.songList.getListDetail = (id: string, page = 1) => {
      const item = decodePluginItem(mounted.name, id)
      const getter = plugin.getMusicSheetInfo || plugin.getAlbumInfo!
      return getter(item, page).then(result => normalizeMusicSheetInfo(mounted.name, result, page, 30, id))
    }
  }
  if (typeof plugin.getTopLists === 'function' && typeof plugin.getTopListDetail === 'function') {
    sdkSource.leaderboard = {
      getBoards() {
        return plugin.getTopLists!().then(result => normalizeTopLists(mounted.name, result))
      },
      getList(bangId: string, page = 1) {
        const item = decodePluginItem(mounted.name, bangId)
        return plugin.getTopListDetail!(item, page)
          .then(result => normalizeMusicSheetInfo(mounted.name, result, page, 30, bangId))
      },
    }
  }
  if (typeof plugin.getMusicComments === 'function') {
    sdkSource.comment = {
      getComment(songInfo: LX.Music.MusicInfo, page = 1, limit = 20) {
        return plugin.getMusicComments!(getRawMusicFreeItem(songInfo), page)
          .then(result => normalizeComments(mounted.name, result, page, limit))
      },
      getHotComment(songInfo: LX.Music.MusicInfo, page = 1, limit = 20) {
        return plugin.getMusicComments!(getRawMusicFreeItem(songInfo), page)
          .then(result => normalizeComments(mounted.name, result, page, limit))
      },
    }
  }

  ;(musicSdk as any)[platform] = sdkSource
  mountedPluginNames.add(mounted.name)
  return { platform, sourceName, sdkSource }
}

export const activateMusicFreePlugin = async(info: LX.UserApi.UserApiInfo, script: string) => {
  destroyMusicFreePlugin()
  activePlugin = mountMusicFreePlugin(script, info)
  const active = createSdkSource(activePlugin)

  const allPlugins: MusicFreePlugin[] = [activePlugin]
  const apiList = await getUserApiList()
  for (const apiInfo of apiList) {
    if (apiInfo.id == info.id) continue
    try {
      const apiScript = await getUserApiScript(apiInfo.id)
      allPlugins.push(mountMusicFreePlugin(apiScript, apiInfo))
    } catch (err) {
      console.log(err)
    }
  }

  const registered = new Map<string, ReturnType<typeof createSdkSource>>([[active.platform, active]])
  for (const pluginInfo of allPlugins) {
    if (registered.has(pluginInfo.name)) continue
    registered.set(pluginInfo.name, createSdkSource(pluginInfo))
  }

  const sourceEntries = Array.from(registered.values())
  const searchableSources = sourceEntries.filter(entry => entry.sdkSource.musicSearch).map(entry => entry.platform)
  const songListSources = sourceEntries.filter(entry => entry.sdkSource.songList?.search || entry.sdkSource.songList?.getList).map(entry => entry.platform)
  const leaderboardSources = sourceEntries.filter(entry => entry.sdkSource.leaderboard).map(entry => entry.platform)
  const sourceNames = sourceEntries.reduce<Record<string, string>>((names, entry) => {
    names[entry.platform] = entry.sourceName
    return names
  }, {})

  ;(musicSdk as any).sources = sourceEntries.map(({ platform, sourceName }) => ({ name: sourceName, id: platform }))
  global.lx.qualityList = {
    ...Object.fromEntries(sourceEntries.map(({ platform }) => [platform, ['128k', '320k', 'flac', 'flac24bit']])),
  } as any
  global.lx.apis = {
    ...Object.fromEntries(sourceEntries.map(({ platform, sdkSource }) => [platform, {
      getMusicUrl: sdkSource.getMusicUrl,
      getLyric: sdkSource.getLyric,
      getPic: sdkSource.getPic,
    }])),
  } as any
  commonActions.setSourceNames({
    ...sourceNames,
    all: '\u5168\u90e8',
  } as any)

  searchMusicState.source = searchableSources.includes(active.platform) ? active.platform : searchableSources[0] ?? ''
  searchMusicState.sources = searchableSources.length > 1 ? ['all', ...searchableSources] : searchableSources
  searchMusicState.listInfos = {
    all: { page: 1, maxPage: 0, limit: 30, total: 0, list: [], key: null },
    ...Object.fromEntries(searchableSources.map(platform => [platform, { page: 1, maxPage: 0, limit: 30, total: 0, list: [], key: '' }])),
  } as any
  searchMusicState.maxPages = Object.fromEntries(searchableSources.map(platform => [platform, 0])) as any
  searchState.temp_source = searchMusicState.source

  searchSonglistState.source = songListSources.includes(active.platform) ? active.platform : songListSources[0] ?? ''
  searchSonglistState.sources = songListSources.length > 1 ? ['all', ...songListSources] : songListSources
  searchSonglistState.listInfos = {
    all: { page: 1, limit: 15, total: 0, list: [], key: null, tagId: '', sortId: '' },
    ...Object.fromEntries(songListSources.map(platform => [platform, { page: 1, limit: 18, total: 0, list: [], key: null, tagId: '', sortId: '' }])),
  } as any
  searchSonglistState.maxPages = Object.fromEntries(songListSources.map(platform => [platform, 0])) as any
  songlistState.sources = sourceEntries.filter(entry => entry.sdkSource.songList?.getList).map(entry => entry.platform)
  songlistState.sortList = Object.fromEntries(sourceEntries.filter(entry => entry.sdkSource.songList?.getList).map(entry => [entry.platform, entry.sdkSource.songList.sortList])) as any
  songlistState.tags = {}
  songlistState.listInfo = {
    list: [],
    total: 0,
    page: 1,
    limit: 30,
    maxPage: 1,
    key: null,
    source: songlistState.sources[0] ?? '',
    tagId: '',
    sortId: 'default',
  }
  songlistState.listDetailInfo = {
    list: [],
    total: 0,
    page: 1,
    maxPage: 1,
    limit: 30,
    key: null,
    source: songlistState.sources[0] ?? '',
    id: '',
    info: {},
  }
  leaderboardState.sources = leaderboardSources
  leaderboardState.boards = {}
  leaderboardState.listDetailInfo = {
    list: [],
    total: 0,
    page: 1,
    maxPage: 1,
    limit: 30,
    key: null,
    source: null,
    id: '',
  }

  global.state_event.apiSourceUpdated(info.id)
  return activePlugin
}
