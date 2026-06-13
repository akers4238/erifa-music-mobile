import { httpFetch } from '../../../request'
import settingState from '@/store/setting/state'
import { eapi, weapi } from './crypto'

export const enhancedUserAgent = 'NeteaseMusic/9.2.30.240910161425(9002030);Dalvik/2.1.0'

const baseCookie = 'os=android; appver=9.2.30; channel=netease;'
const apiPath = path => path.replace(/^\/api/, '')
const normalizeCookie = cookie => (cookie || '')
  .replace(/^\s*cookie:\s*/i, '')
  .replace(/[\r\n]+/g, '; ')
  .split(';')
  .map(item => item.trim())
  .filter(Boolean)
  .join('; ')
const getCookie = () => [baseCookie, normalizeCookie(settingState.setting['common.neteaseCookie'])]
  .filter(Boolean)
  .join('; ')

const commonHeaders = {
  'User-Agent': enhancedUserAgent,
  origin: 'https://music.163.com',
  referer: 'https://music.163.com/',
}

export const eapiRequest = (path, data, headers = {}) => {
  return httpFetch(`https://interface.music.163.com/eapi${apiPath(path)}`, {
    method: 'post',
    headers: {
      ...commonHeaders,
      cookie: getCookie(),
      ...headers,
    },
    form: eapi(path, data),
  })
}

export const weapiRequest = (path, data, headers = {}) => {
  return httpFetch(`https://music.163.com/weapi${apiPath(path)}`, {
    method: 'post',
    headers: {
      ...commonHeaders,
      cookie: getCookie(),
      ...headers,
    },
    form: weapi(data),
  })
}

export const normalizeEnhancedUrl = (body, type) => {
  const item = Array.isArray(body?.data) ? body.data[0] : body?.data
  if (!item?.url) throw new Error('Get music url failed')
  return {
    type,
    url: item.url,
    headers: {
      Referer: 'https://music.163.com/',
      'User-Agent': enhancedUserAgent,
    },
  }
}
