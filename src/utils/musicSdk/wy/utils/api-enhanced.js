import { httpFetch } from '../../../request'
import settingState from '@/store/setting/state'
import { eapi, weapi } from './crypto'

export const enhancedUserAgent = 'NeteaseMusic/9.2.30.240910161425(9002030);Dalvik/2.1.0'

const apiUserAgent = 'NeteaseMusic 9.0.90/5038 (iPhone; iOS 16.2; zh_CN)'
const osMap = {
  pc: {
    os: 'pc',
    appver: '3.1.17.204416',
    osver: 'Microsoft-Windows-10-Professional-build-19045-64bit',
    channel: 'netease',
  },
  android: {
    os: 'android',
    appver: '8.20.20.231215173437',
    osver: '14',
    channel: 'xiaomi',
  },
  iphone: {
    os: 'iPhone OS',
    appver: '9.0.90',
    osver: '16.2',
    channel: 'distribution',
  },
}
const hexChars = '0123456789ABCDEF'
const randomHex = length => {
  const chars = []
  for (let i = 0; i < length; i++) chars.push(hexChars.charAt(Math.floor(Math.random() * hexChars.length)))
  return chars.join('')
}
const deviceId = randomHex(52)
const WNMCID = `${Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')}.${Date.now()}.01.0`

const apiPath = path => path.replace(/^\/api/, '')
const normalizeCookie = cookie => (cookie || '')
  .replace(/^\s*cookie:\s*/i, '')
  .replace(/[\r\n]+/g, '; ')
  .split(';')
  .map(item => item.trim())
  .filter(Boolean)
  .join('; ')

const parseCookie = cookie => {
  const cookieObj = {}
  for (const item of normalizeCookie(cookie).split(';')) {
    const index = item.indexOf('=')
    if (index < 0) continue
    const key = item.slice(0, index).trim()
    const value = item.slice(index + 1).trim()
    if (!key) continue
    cookieObj[key] = value
  }
  return cookieObj
}

const createHeaderCookie = cookieObj => Object.entries(cookieObj)
  .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  .join('; ')

const generateRequestId = () => `${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`

const getCookieObj = () => {
  const cookie = parseCookie(settingState.setting['common.neteaseCookie'])
  const os = osMap[cookie.os] || osMap.pc
  const nuid = cookie._ntes_nuid || randomHex(32)

  return {
    ...cookie,
    __remember_me: cookie.__remember_me || 'true',
    ntes_kaola_ad: cookie.ntes_kaola_ad || '1',
    _ntes_nuid: nuid,
    _ntes_nnid: cookie._ntes_nnid || `${nuid},${Date.now()}`,
    WNMCID: cookie.WNMCID || WNMCID,
    WEVNSM: cookie.WEVNSM || '1.0.0',
    NMTID: cookie.NMTID || randomHex(16),
    osver: cookie.osver || os.osver,
    deviceId: cookie.deviceId || deviceId,
    os: cookie.os || os.os,
    channel: cookie.channel || os.channel,
    appver: cookie.appver || os.appver,
  }
}

const createEapiHeader = cookie => {
  const csrfToken = cookie.__csrf || ''
  const header = {
    osver: cookie.osver || '',
    deviceId: cookie.deviceId || '',
    os: cookie.os || 'android',
    appver: cookie.appver || '9.2.30',
    versioncode: cookie.versioncode || '140',
    mobilename: cookie.mobilename || '',
    buildver: cookie.buildver || Math.floor(Date.now() / 1000).toString(),
    resolution: cookie.resolution || '1920x1080',
    __csrf: csrfToken,
    channel: cookie.channel || 'netease',
    requestId: generateRequestId(),
  }

  if (cookie.MUSIC_U) header.MUSIC_U = cookie.MUSIC_U
  if (cookie.MUSIC_A) header.MUSIC_A = cookie.MUSIC_A

  return header
}

const getWeapiCookie = () => createHeaderCookie(getCookieObj())

const commonHeaders = {
  origin: 'https://music.163.com',
  referer: 'https://music.163.com/',
}

export const eapiRequest = (path, data, headers = {}) => {
  const cookie = getCookieObj()
  const header = createEapiHeader(cookie)
  return httpFetch(`https://interface.music.163.com/eapi${apiPath(path)}`, {
    method: 'post',
    headers: {
      'User-Agent': apiUserAgent,
      Cookie: createHeaderCookie(header),
      ...headers,
    },
    form: eapi(path, { ...data, header }),
  })
}

export const weapiRequest = (path, data, headers = {}) => {
  const cookie = getCookieObj()
  return httpFetch(`https://music.163.com/weapi${apiPath(path)}`, {
    method: 'post',
    headers: {
      ...commonHeaders,
      'User-Agent': enhancedUserAgent,
      Cookie: getWeapiCookie(),
      ...headers,
    },
    form: weapi({
      ...data,
      csrf_token: cookie.__csrf || '',
    }),
  })
}

export const normalizeEnhancedUrl = (body, type) => {
  const item = Array.isArray(body?.data) ? body.data[0] : body?.data
  if (!item?.url) {
    const code = item?.code || body?.code
    const message = item?.message || body?.message || body?.msg || 'Get music url failed'
    throw new Error(code ? `${message} (${code})` : message)
  }
  return {
    type,
    url: item.url,
    headers: {
      Referer: 'https://music.163.com/',
      'User-Agent': enhancedUserAgent,
    },
  }
}
