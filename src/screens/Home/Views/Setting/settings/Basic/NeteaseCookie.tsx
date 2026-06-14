import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Image, View } from 'react-native'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import Text from '@/components/common/Text'
import Button from '../../components/Button'
import SubTitle from '../../components/SubTitle'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'
import { checkLoginQr, createLoginQr } from '@/utils/musicSdk/wy/login'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const cookie = useSettingValue('common.neteaseCookie')
  const loginDialogRef = useRef<DialogType>(null)
  const [loginVisible, setLoginVisible] = useState(false)
  const [loginKey, setLoginKey] = useState('')
  const [loginUrl, setLoginUrl] = useState('')
  const [loginStatus, setLoginStatus] = useState('')

  const refreshLoginQr = useCallback(async() => {
    setLoginStatus(t('setting_basic_netease_login_loading'))
    try {
      const qr = await createLoginQr()
      setLoginKey(String(qr.key))
      setLoginUrl(String(qr.url))
      setLoginStatus(t('setting_basic_netease_login_wait_scan'))
    } catch {
      setLoginKey('')
      setLoginUrl('')
      setLoginStatus(t('setting_basic_netease_login_failed'))
    }
  }, [t])
  const handleShowLogin = () => {
    if (!loginVisible) setLoginVisible(true)
    requestAnimationFrame(() => {
      loginDialogRef.current?.setVisible(true)
      void refreshLoginQr()
    })
  }
  const handleCancelLogin = () => {
    loginDialogRef.current?.setVisible(false)
  }
  const handleHideLogin = () => {
    setLoginVisible(false)
    setLoginKey('')
    setLoginUrl('')
    setLoginStatus('')
  }

  useEffect(() => {
    if (!loginVisible || !loginKey) return

    let canceled = false
    const check = async() => {
      try {
        const result = await checkLoginQr(loginKey)
        if (canceled) return

        switch (result.code) {
          case 800:
            setLoginStatus(t('setting_basic_netease_login_expired'))
            setLoginKey('')
            break
          case 801:
            setLoginStatus(t('setting_basic_netease_login_wait_scan'))
            break
          case 802:
            setLoginStatus(t('setting_basic_netease_login_wait_confirm'))
            break
          case 803:
            if (result.cookie) {
              updateSetting({ 'common.neteaseCookie': result.cookie })
              setLoginStatus(t('setting_basic_netease_login_success'))
              handleCancelLogin()
            } else {
              setLoginStatus(t('setting_basic_netease_login_no_cookie'))
            }
            break
        }
      } catch {
        if (!canceled) setLoginStatus(t('setting_basic_netease_login_failed'))
      }
    }
    const timer = setInterval(() => {
      void check()
    }, 2000)
    void check()

    return () => {
      canceled = true
      clearInterval(timer)
    }
  }, [loginKey, loginVisible, t])

  useEffect(() => {
    if (!loginVisible) return

    const timer = setInterval(() => {
      void refreshLoginQr()
    }, 60000)

    return () => {
      clearInterval(timer)
    }
  }, [loginVisible, refreshLoginQr])

  return (
    <SubTitle title={t('setting_basic_netease_login')}>
      <View style={styles.btn}>
        <Button onPress={handleShowLogin}>{t('setting_basic_netease_login_btn')}</Button>
      </View>
      <Text style={styles.loginSummary} size={12} color={theme['c-600']}>{t(cookie ? 'setting_basic_netease_login_saved' : 'setting_basic_netease_login_not_saved')}</Text>
      {
        loginVisible
          ? (
              <Dialog title={t('setting_basic_netease_login_title')} height="64%" ref={loginDialogRef} bgHide={false} onHide={handleHideLogin}>
                <View style={styles.loginContent}>
                  {
                    loginUrl
                      ? <Image style={styles.qrImage} source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(loginUrl)}` }} />
                      : null
                  }
                  <Text style={styles.loginStatus} size={13} color={theme['c-600']}>{loginStatus}</Text>
                </View>
                <View style={styles.dialogBtns}>
                  <Button onPress={refreshLoginQr}>{t('setting_basic_netease_login_refresh')}</Button>
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
    flexGrow: 1,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 8,
  },
  qrImage: {
    width: 220,
    height: 220,
    marginBottom: 12,
  },
  loginStatus: {
    textAlign: 'center',
  },
  dialogBtns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    paddingLeft: 15,
  },
})
