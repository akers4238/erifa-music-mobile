import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Linking, View } from 'react-native'
import WebView from 'react-native-webview'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import Text from '@/components/common/Text'
import Button from '../../components/Button'
import SubTitle from '../../components/SubTitle'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'
import { clearWebLoginCookie, flushWebLoginCookie, getWebLoginCookie } from '@/utils/musicSdk/wy/login'

const loginUrl = 'https://music.163.com/m/login'
const userAgent = 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const cookie = useSettingValue('common.neteaseCookie')
  const loginDialogRef = useRef<DialogType>(null)
  const [loginVisible, setLoginVisible] = useState(false)
  const [loginStatus, setLoginStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [webViewKey, setWebViewKey] = useState(0)
  const checkingRef = useRef(false)

  const handleCancelLogin = useCallback(() => {
    loginDialogRef.current?.setVisible(false)
  }, [])

  const saveWebCookie = useCallback(async(showWaiting = false) => {
    if (checkingRef.current) return
    checkingRef.current = true
    if (showWaiting) setLoading(true)
    try {
      await flushWebLoginCookie()
      const webCookie = await getWebLoginCookie()
      if (webCookie) {
        updateSetting({ 'common.neteaseCookie': webCookie })
        setLoginStatus(t('setting_basic_netease_login_success'))
        handleCancelLogin()
      } else if (showWaiting) {
        setLoginStatus(t('setting_basic_netease_login_wait_web'))
      }
    } catch {
      if (showWaiting) setLoginStatus(t('setting_basic_netease_login_failed'))
    } finally {
      checkingRef.current = false
      if (showWaiting) setLoading(false)
    }
  }, [handleCancelLogin, t])

  const handleShowLogin = () => {
    if (!loginVisible) setLoginVisible(true)
    setLoginStatus(t('setting_basic_netease_login_wait_web'))
    requestAnimationFrame(() => {
      loginDialogRef.current?.setVisible(true)
    })
  }

  const handleHideLogin = () => {
    setLoginVisible(false)
    setLoginStatus('')
    setLoading(false)
  }

  const handleClearLogin = async() => {
    setLoading(true)
    try {
      await clearWebLoginCookie()
      updateSetting({ 'common.neteaseCookie': '' })
      setLoginStatus(t('setting_basic_netease_login_cleared'))
    } catch {
      setLoginStatus(t('setting_basic_netease_login_failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleShouldStartLoad = useCallback(({ url }: { url: string }) => {
    if (/^(https?:|about:blank)/i.test(url)) return true
    void Linking.openURL(url).catch(() => {
      setLoginStatus(t('setting_basic_netease_login_failed'))
    })
    return false
  }, [t])

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
    <SubTitle title={t('setting_basic_netease_login')}>
      <View style={styles.btn}>
        <Button onPress={handleShowLogin}>{t('setting_basic_netease_login_btn')}</Button>
        <Button disabled={!cookie || loading} onPress={handleClearLogin}>{t('setting_basic_netease_login_clear')}</Button>
      </View>
      <Text style={styles.loginSummary} size={12} color={theme['c-600']}>{t(cookie ? 'setting_basic_netease_login_saved' : 'setting_basic_netease_login_not_saved')}</Text>
      {
        loginStatus
          ? <Text style={styles.loginSummary} size={12} color={theme['c-600']}>{loginStatus}</Text>
          : null
      }
      {
        loginVisible
          ? (
              <Dialog title={t('setting_basic_netease_login_title')} fullScreen ref={loginDialogRef} bgHide={false} onHide={handleHideLogin}>
                <View style={styles.loginContent}>
                  <WebView
                    source={{ uri: loginUrl }}
                    key={webViewKey}
                    userAgent={userAgent}
                    sharedCookiesEnabled
                    thirdPartyCookiesEnabled
                    domStorageEnabled
                    javaScriptEnabled
                    cacheEnabled
                    setSupportMultipleWindows={false}
                    javaScriptCanOpenWindowsAutomatically={false}
                    mixedContentMode="always"
                    androidLayerType="hardware"
                    overScrollMode="never"
                    onLoadEnd={() => {
                      void saveWebCookie()
                    }}
                    onShouldStartLoadWithRequest={handleShouldStartLoad}
                    onError={() => {
                      setLoginStatus(t('setting_basic_netease_login_failed'))
                    }}
                    onHttpError={({ nativeEvent }) => {
                      if (nativeEvent.statusCode >= 400) setLoginStatus(`${t('setting_basic_netease_login_failed')} (${nativeEvent.statusCode})`)
                    }}
                    onRenderProcessGone={() => {
                      setLoginStatus(t('setting_basic_netease_login_failed'))
                      setWebViewKey(key => key + 1)
                    }}
                    style={styles.webview}
                  />
                  <Text style={styles.loginStatus} size={13} color={theme['c-600']}>{loginStatus}</Text>
                </View>
                <View style={styles.dialogBtns}>
                  <Button disabled={loading} onPress={() => { void saveWebCookie(true) }}>{t('setting_basic_netease_login_save_web')}</Button>
                  <Button onPress={handleCancelLogin}>{t('cancel')}</Button>
                </View>
              </Dialog>
            )
          : null
      }
    </SubTitle>
  )
})

const styles = createStyle({
  btn: {
    marginTop: 10,
    flexDirection: 'row',
  },
  loginSummary: {
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
