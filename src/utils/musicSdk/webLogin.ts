import CookieManager from '@react-native-cookies/cookies'

const stringifyCookieMap = (cookieMap: Awaited<ReturnType<typeof CookieManager.get>>) => Object.entries(cookieMap)
  .map(([key, cookie]) => {
    const value = typeof cookie == 'string' ? cookie : cookie?.value
    return value == null ? '' : `${key}=${value}`
  })
  .filter(Boolean)
  .join('; ')

const mergeCookies = (cookieList: string[]) => cookieList
  .join('; ')
  .split(';')
  .map(cookie => cookie.trim())
  .filter(Boolean)
  .filter((cookie, index, list) => {
    const key = cookie.split('=')[0]
    return list.findIndex(item => item.split('=')[0] == key) == index
  })
  .join('; ')

export const getWebCookies = async(cookieUrls: string[], requiredKeys: readonly string[]) => {
  const cookieList = await Promise.all(cookieUrls.map(async(url) => {
    const cookieMap = await CookieManager.get(url)
    return stringifyCookieMap(cookieMap)
  }))
  const cookie = mergeCookies(cookieList)
  return requiredKeys.some(key => cookie.includes(`${key}=`)) ? cookie : ''
}

export const flushWebCookies = async() => {
  await CookieManager.flush()
}
