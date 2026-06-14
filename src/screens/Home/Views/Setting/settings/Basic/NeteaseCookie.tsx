import { memo, useEffect, useRef, useState } from 'react'
import { Image, View } from 'react-native'

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
import { checkLoginQr, createLoginQr } from '@/utils/musicSdk/wy/login'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const cookie = useSettingValue('common.neteaseCookie')
  const dialogRef = useRef<DialogType>(null)
  const loginDialogRef = useRef<DialogType>(null)
  const [visible, setVisible] = useState(false)
  const [loginVisible, setLoginVisible] = useState(false)
  const [text, setText] = useState(cookie)
  const [loginKey, setLoginKey] = useState('')
  const [loginUrl, setLoginUrl] = useState('')
  const [loginStatus, setLoginStatus] = useState('')

  const refreshLoginQr = async() => {
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
  }

  const handleShow = () => {
    setText(cookie)
    if (!visible) setVisible(true)
    requestAnimationFrame(() => {
      dialogRef.current?.setVisible(true)
    })
  }
  const handleCancel = () => {
    dialogRef.current?.setVisible(false)
  }
  const handleConfirm = () => {
    const newValue = text.trim()
    if (newValue != cookie) updateSetting({ 'common.neteaseCookie': newValue })
    handleCancel()
  }
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

  return (
    <SubTitle title={t('setting_basic_netease_cookie')}>
      <View style={styles.btn}>
        <Button onPress={handleShow}>{t(cookie ? 'setting_basic_netease_cookie_btn_edit' : 'setting_basic_netease_cookie_btn_add')}</Button>
        <Button onPress={handleShowLogin}>{t('setting_basic_netease_login_btn')}</Button>
      </View>
      {
        visible
          ? (
              <Dialog title={t('setting_basic_netease_cookie')} height="56%" ref={dialogRef} bgHide={false}>
                <View style={styles.content}>
                  <Input
                    value={text}
                    onChangeText={setText}
                    multiline
                    textAlignVertical="top"
                    placeholder={t('setting_basic_netease_cookie_placeholder')}
                    size={13}
                    style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
                  />
                  <Text style={styles.tip} size={12} color={theme['c-600']}>{t('setting_basic_netease_cookie_tip')}</Text>
                </View>
                <View style={styles.dialogBtns}>
                  <Button onPress={handleCancel}>{t('cancel')}</Button>
                  <Button onPress={handleConfirm}>{t('confirm')}</Button>
                </View>
              </Dialog>
            )
          : null
      }
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
  content: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 8,
  },
  input: {
    minWidth: 290,
    minHeight: 120,
    paddingTop: 5,
    paddingBottom: 5,
  },
  tip: {
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
