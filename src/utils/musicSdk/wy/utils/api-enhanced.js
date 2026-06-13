import { httpFetch } from '../../../request'
import settingState from '@/store/setting/state'
import { eapi, weapi } from './crypto'

export const enhancedUserAgent = 'NeteaseMusic/9.2.30.240910161425(9002030);Dalvik/2.1.0'

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

const getCookieObj = () => ({
  os: 'android',
  appver: '9.2.30',
  versioncode: '9002030',
  channel: 'netease',
  ...parseCookie(settingState.setting['common.neteaseCookie']),
})

const createEapiHeader = cookie => {
  const csrfToken = cookie.__csrf || ''
  const header = {
    osver: cookie.osver || '',
    deviceId: cookie.deviceId || '',
    os: cookie.os || 'android',
    appver: cookie.appver || '9.2.30',
    versioncode: cookie.versioncode || '9002030',
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
  'User-Agent': enhancedUserAgent,
  origin: 'https://music.163.com',
  referer: 'https://music.163.com/',
}

export const eapiRequest = (path, data, headers = {}) => {
  const cookie = getCookieObj()
  const header = createEapiHeader(cookie)
  return httpFetch(`https://interface.music.163.com/eapi${apiPath(path)}`, {
    method: 'post',
    headers: {
      ...commonHeaders,
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
