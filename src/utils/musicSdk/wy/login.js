import { eapiRequest } from './utils/api-enhanced'

const parseSetCookie = headers => {
  const rawCookie = headers?.['set-cookie'] || headers?.['Set-Cookie'] || headers?.map?.['set-cookie'] || headers?.map?.['Set-Cookie'] || ''
  const cookieList = Array.isArray(rawCookie) ? rawCookie : String(rawCookie).split(/,(?=\s*[^;,]+=)/)

  return cookieList
    .map(cookie => String(cookie).split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

export const createLoginQr = async() => {
  const requestObj = eapiRequest('/api/login/qrcode/unikey', {
    type: 3,
  })
  const { body } = await requestObj.promise
  const key = body?.unikey || body?.data?.unikey
  if (!key) throw new Error('Create login QR failed')

  return {
    key,
    url: `https://music.163.com/login?codekey=${key}`,
  }
}

export const checkLoginQr = async(key) => {
  const requestObj = eapiRequest('/api/login/qrcode/client/login', {
    key,
    type: 3,
  })
  const { body, headers } = await requestObj.promise

  return {
    ...body,
    cookie: parseSetCookie(headers),
  }
}
