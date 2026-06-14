import CookieManager from '@react-native-cookies/cookies'

const cookieUrls = [
  'https://music.163.com',
  'https://interface.music.163.com',
]

const stringifyCookieMap = cookieMap => Object.entries(cookieMap)
  .map(([key, cookie]) => {
    const value = typeof cookie === 'string' ? cookie : cookie?.value
    return value == null ? '' : `${key}=${value}`
  })
  .filter(Boolean)
  .join('; ')

const mergeCookies = cookieList => cookieList
  .join('; ')
  .split(';')
  .map(cookie => cookie.trim())
  .filter(Boolean)
  .filter((cookie, index, list) => {
    const key = cookie.split('=')[0]
    return list.findIndex(item => item.split('=')[0] == key) == index
  })
  .join('; ')

export const getWebLoginCookie = async() => {
  const cookieList = await Promise.all(cookieUrls.map(async(url) => {
    const cookieMap = await CookieManager.get(url)
    return stringifyCookieMap(cookieMap)
  }))
  const cookie = mergeCookies(cookieList)
  return cookie.includes('MUSIC_U=') || cookie.includes('MUSIC_A=') ? cookie : ''
}

export const clearWebLoginCookie = async() => {
  await CookieManager.clearAll()
  await CookieManager.flush()
}

export const flushWebLoginCookie = async() => {
  await CookieManager.flush()
}
