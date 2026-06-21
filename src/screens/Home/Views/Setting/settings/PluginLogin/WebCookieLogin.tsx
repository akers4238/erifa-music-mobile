import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Linking, View } from 'react-native'
import WebView from 'react-native-webview'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import Text from '@/components/common/Text'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { flushWebCookies, getWebCookies } from '@/utils/musicSdk/webLogin'
import { createStyle } from '@/utils/tools'
import Button from '../../components/Button'

export type LoginSettingKey =
  | 'common.qqMusicCookie'
  | 'common.bilibiliCookie'
  | 'common.youtubeCookie'

interface Props {
  title: string
  loginUrl: string
  userAgent: string
  cookieUrls: string[]
  requiredKeys: readonly string[]
  settingKey: LoginSettingKey
}

const getIntentFallbackUrl = (url: string) => {
  if (!url.startsWith('intent://')) return ''
  const match = /(?:^|;)S\.browser_fallback_url=([^;]+)/.exec(url)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

const isWebUrl = (url: string) => /^(https?:|about:blank|data:|blob:|file:)/i.test(url)

export default memo(({ title, loginUrl, userAgent, cookieUrls, requiredKeys, settingKey }: Props) => {
  const t = useI18n()
  const theme = useTheme()
  const cookie = useSettingValue(settingKey)
  const loginDialogRef = useRef<DialogType>(null)
  const checkingRef = useRef(false)
  const [loginVisible, setLoginVisible] = useState(false)
  const [loginStatus, setLoginStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [webViewKey, setWebViewKey] = useState(0)
  const [loginPageUrl, setLoginPageUrl] = useState(loginUrl)

  const updateLoginSetting = useCallback((value: string) => {
    const setting: Partial<LX.AppSetting> = {}
    setting[settingKey] = value
    updateSetting(setting)
  }, [settingKey])

  const handleCancelLogin = useCallback(() => {
    loginDialogRef.current?.setVisible(false)
  }, [])

  const saveWebCookie = useCallback(async(showWaiting = false) => {
    if (checkingRef.current) return
    checkingRef.current = true
    if (showWaiting) setLoading(true)
    try {
      await flushWebCookies()
      const webCookie = await getWebCookies(cookieUrls, requiredKeys)
      if (webCookie) {
        updateLoginSetting(webCookie)
        setLoginStatus(t('setting_plugin_login_web_success'))
        handleCancelLogin()
      } else if (showWaiting) {
        setLoginStatus(t('setting_plugin_login_web_wait'))
      }
    } catch {
      if (showWaiting) setLoginStatus(t('setting_plugin_login_web_failed'))
    } finally {
      checkingRef.current = false
      if (showWaiting) setLoading(false)
    }
  }, [cookieUrls, handleCancelLogin, requiredKeys, t, updateLoginSetting])

  const handleShowLogin = () => {
    if (!loginVisible) setLoginVisible(true)
    setLoginPageUrl(loginUrl)
    setLoginStatus(t('setting_plugin_login_web_wait'))
    requestAnimationFrame(() => {
      loginDialogRef.current?.setVisible(true)
    })
  }

  const handleHideLogin = () => {
    setLoginVisible(false)
    setLoginStatus('')
    setLoading(false)
  }

  const handleClearLogin = () => {
    updateLoginSetting('')
    setLoginStatus(t('setting_plugin_login_web_cleared'))
  }

  const loadLoginUrl = useCallback((targetUrl: string) => {
    if (!targetUrl) return
    setLoginPageUrl(targetUrl)
    setWebViewKey(key => key + 1)
  }, [])

  const handleShouldStartLoad = useCallback(({ url }: { url: string }) => {
    if (isWebUrl(url)) return true
    const fallbackUrl = getIntentFallbackUrl(url)
    if (/^https?:/i.test(fallbackUrl)) {
      loadLoginUrl(fallbackUrl)
      return false
    }
    void Linking.openURL(url).catch(() => {
      setLoginStatus(t('setting_plugin_login_web_failed'))
    })
    return false
  }, [loadLoginUrl, t])

  useEffect(() => {
    if (!loginVisible) return
    const timer = setInterval(() => {
      void saveWebCookie()
    }, 6000)

    return () => {
      clearInterval(timer)
    }
  }, [loginVisible, saveWebCookie])

  return (
    <View style={styles.item}>
      <Text style={styles.title} size={15}>{title}</Text>
      <View style={styles.btns}>
        <Button disabled={loading} onPress={handleShowLogin}>{t('setting_plugin_login_web_btn')}</Button>
        <Button disabled={!cookie || loading} onPress={handleClearLogin}>{t('setting_plugin_login_web_clear')}</Button>
      </View>
      <Text style={styles.summary} size={12} color={theme['c-600']}>{t(cookie ? 'setting_plugin_login_web_saved' : 'setting_plugin_login_web_not_saved')}</Text>
      {
        loginStatus
          ? <Text style={styles.summary} size={12} color={theme['c-600']}>{loginStatus}</Text>
          : null
      }
      {
        loginVisible
          ? (
              <Dialog title={t('setting_plugin_login_web_title', { name: title })} fullScreen ref={loginDialogRef} bgHide={false} onHide={handleHideLogin}>
                <View style={styles.loginContent}>
                  <WebView
                    source={{ uri: loginPageUrl }}
                    key={webViewKey}
                    userAgent={userAgent}
                    sharedCookiesEnabled
                    thirdPartyCookiesEnabled
                    domStorageEnabled
                    javaScriptEnabled
                    cacheEnabled
                    originWhitelist={['*']}
                    androidLayerType="hardware"
                    nestedScrollEnabled
                    textZoom={100}
                    mediaPlaybackRequiresUserAction={false}
                    keyboardDisplayRequiresUserAction={false}
                    setSupportMultipleWindows={false}
                    javaScriptCanOpenWindowsAutomatically={false}
                    mixedContentMode="always"
                    overScrollMode="never"
                    allowsInlineMediaPlayback
                    onOpenWindow={({ nativeEvent }) => {
                      if (nativeEvent.targetUrl && isWebUrl(nativeEvent.targetUrl)) loadLoginUrl(nativeEvent.targetUrl)
                    }}
                    onLoadEnd={() => {
                      void saveWebCookie()
                    }}
                    onShouldStartLoadWithRequest={handleShouldStartLoad}
                    onError={() => {
                      setLoginStatus(t('setting_plugin_login_web_failed'))
                    }}
                    onHttpError={({ nativeEvent }) => {
                      if (nativeEvent.statusCode >= 400) setLoginStatus(`${t('setting_plugin_login_web_failed')} (${nativeEvent.statusCode})`)
                    }}
                    onRenderProcessGone={() => {
                      setLoginStatus(t('setting_plugin_login_web_failed'))
                      setWebViewKey(key => key + 1)
                    }}
                    style={styles.webview}
                  />
                  <Text style={styles.loginStatus} size={13} color={theme['c-600']}>{loginStatus}</Text>
                </View>
                <View style={styles.dialogBtns}>
                  <Button disabled={loading} onPress={() => { void saveWebCookie(true) }}>{t('setting_plugin_login_web_save')}</Button>
                  <Button onPress={handleCancelLogin}>{t('cancel')}</Button>
                </View>
              </Dialog>
            )
          : null
      }
    </View>
  )
})

const styles = createStyle({
  item: {
    marginTop: 12,
  },
  title: {
    marginLeft: -10,
    marginBottom: 10,
  },
  btns: {
    marginTop: 10,
    flexDirection: 'row',
  },
  summary: {
    marginTop: 8,
  },
  loginContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  webview: {
    flex: 1,
  },
  loginStatus: {
    marginTop: 8,
    textAlign: 'center',
  },
  dialogBtns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    paddingLeft: 15,
  },
})
