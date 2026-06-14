import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import WebView from 'react-native-webview'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import Button from '../../components/Button'
import SubTitle from '../../components/SubTitle'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'
import { clearWebLoginCookie, flushWebLoginCookie, getWebLoginCookie } from '@/utils/musicSdk/wy/login'
import songListApi from '@/utils/musicSdk/wy/songList'

const loginUrl = 'https://music.163.com/#/login'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const cookie = useSettingValue('common.neteaseCookie')
  const loginDialogRef = useRef<DialogType>(null)
  const createDialogRef = useRef<DialogType>(null)
  const [loginVisible, setLoginVisible] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [loginStatus, setLoginStatus] = useState('')
  const [playlistName, setPlaylistName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCancelLogin = useCallback(() => {
    loginDialogRef.current?.setVisible(false)
  }, [])

  const saveWebCookie = useCallback(async() => {
    if (loading) return
    setLoading(true)
    try {
      await flushWebLoginCookie()
      const webCookie = await getWebLoginCookie()
      if (webCookie) {
        updateSetting({ 'common.neteaseCookie': webCookie })
        setLoginStatus(t('setting_basic_netease_login_success'))
        handleCancelLogin()
      } else {
        setLoginStatus(t('setting_basic_netease_login_wait_web'))
      }
    } catch {
      setLoginStatus(t('setting_basic_netease_login_failed'))
    } finally {
      setLoading(false)
    }
  }, [handleCancelLogin, loading, t])

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

  const handleShowCreate = () => {
    if (!createVisible) setCreateVisible(true)
    requestAnimationFrame(() => {
      createDialogRef.current?.setVisible(true)
    })
  }

  const handleCancelCreate = () => {
    createDialogRef.current?.setVisible(false)
  }

  const handleHideCreate = () => {
    setCreateVisible(false)
    setPlaylistName('')
    setLoading(false)
  }

  const handleCreatePlaylist = async() => {
    const name = playlistName.trim()
    if (!name) {
      setLoginStatus(t('setting_basic_netease_playlist_name_required'))
      return
    }

    setLoading(true)
    setLoginStatus(t('setting_basic_netease_playlist_creating'))
    try {
      await songListApi.createPlaylist(name)
      setLoginStatus(t('setting_basic_netease_playlist_create_success'))
      handleCancelCreate()
    } catch (err) {
      setLoginStatus(String((err as Error)?.message || t('setting_basic_netease_playlist_create_failed')))
    } finally {
      setLoading(false)
    }
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

  useEffect(() => {
    if (!loginVisible) return
    const timer = setInterval(() => {
      void saveWebCookie()
    }, 2000)

    return () => {
      clearInterval(timer)
    }
  }, [loginVisible, saveWebCookie])

  return (
    <SubTitle title={t('setting_basic_netease_login')}>
      <View style={styles.btn}>
        <Button onPress={handleShowLogin}>{t('setting_basic_netease_login_btn')}</Button>
        <Button disabled={!cookie || loading} onPress={handleShowCreate}>{t('setting_basic_netease_playlist_create')}</Button>
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
              <Dialog title={t('setting_basic_netease_login_title')} height="82%" ref={loginDialogRef} bgHide={false} onHide={handleHideLogin}>
                <View style={styles.loginContent}>
                  <WebView
                    source={{ uri: loginUrl }}
                    sharedCookiesEnabled
                    thirdPartyCookiesEnabled
                    domStorageEnabled
                    javaScriptEnabled
                    onLoadEnd={() => {
                      void saveWebCookie()
                    }}
                    style={styles.webview}
                  />
                  <Text style={styles.loginStatus} size={13} color={theme['c-600']}>{loginStatus}</Text>
                </View>
                <View style={styles.dialogBtns}>
                  <Button disabled={loading} onPress={saveWebCookie}>{t('setting_basic_netease_login_save_web')}</Button>
                  <Button onPress={handleCancelLogin}>{t('cancel')}</Button>
                </View>
              </Dialog>
            )
          : null
      }
      {
        createVisible
          ? (
              <Dialog title={t('setting_basic_netease_playlist_create_title')} height="32%" ref={createDialogRef} bgHide={false} onHide={handleHideCreate}>
                <View style={styles.createContent}>
                  <Input
                    value={playlistName}
                    onChangeText={setPlaylistName}
                    style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
                    placeholder={t('setting_basic_netease_playlist_name_placeholder')}
                  />
                </View>
                <View style={styles.dialogBtns}>
                  <Button disabled={loading} onPress={handleCreatePlaylist}>{t('confirm')}</Button>
                  <Button onPress={handleCancelCreate}>{t('cancel')}</Button>
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
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  webview: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 360,
  },
  createContent: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  input: {
    alignSelf: 'stretch',
    height: 36,
    borderRadius: 4,
    paddingHorizontal: 8,
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
