import { weapiRequest } from './utils/api-enhanced'
import { toMD5 } from '../utils'

const parseSetCookie = headers => {
  const rawCookie = headers?.['set-cookie'] || headers?.['Set-Cookie'] || headers?.map?.['set-cookie'] || headers?.map?.['Set-Cookie'] || ''
  const cookieList = Array.isArray(rawCookie) ? rawCookie : String(rawCookie).split(/,(?=\s*[^;,]+=)/)

  return cookieList
    .map(cookie => String(cookie).split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

const mergeCookie = (bodyCookie, headers) => {
  const cookies = []
  const headerCookie = parseSetCookie(headers)
  if (bodyCookie) cookies.push(String(bodyCookie))
  if (headerCookie) cookies.push(headerCookie)
  return cookies
    .join('; ')
    .split(';')
    .map(cookie => cookie.trim())
    .filter(Boolean)
    .filter((cookie, index, list) => list.indexOf(cookie) == index)
    .join('; ')
}

export const sendPhoneCaptcha = async({ phone, countrycode = '86' }) => {
  const requestObj = weapiRequest('/api/sms/captcha/sent', {
    ctcode: countrycode,
    secrete: 'music_middleuser_pclogin',
    cellphone: phone,
  })
  const { body } = await requestObj.promise
  return body
}

export const loginByPhone = async({ phone, password, captcha, countrycode = '86' }) => {
  const useCaptcha = !!captcha
  const requestObj = weapiRequest('/api/w/login/cellphone', {
    type: '1',
    https: 'true',
    phone,
    countrycode,
    captcha,
    [useCaptcha ? 'captcha' : 'password']: useCaptcha ? captcha : toMD5(password),
    remember: 'true',
  })
  const { body, headers } = await requestObj.promise

  return {
    ...body,
    cookie: mergeCookie(body?.cookie, headers),
  }
}
