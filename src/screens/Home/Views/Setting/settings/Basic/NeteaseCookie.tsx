import { memo, useRef, useState } from 'react'
import { View } from 'react-native'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import Button from '../../components/Button'
import SubTitle from '../../components/SubTitle'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'
import { loginByPhone, sendPhoneCaptcha } from '@/utils/musicSdk/wy/login'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const cookie = useSettingValue('common.neteaseCookie')
  const loginDialogRef = useRef<DialogType>(null)
  const [loginVisible, setLoginVisible] = useState(false)
  const [phone, setPhone] = useState('')
  const [countrycode, setCountrycode] = useState('86')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [loginStatus, setLoginStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handleShowLogin = () => {
    if (!loginVisible) setLoginVisible(true)
    requestAnimationFrame(() => {
      loginDialogRef.current?.setVisible(true)
    })
  }
  const handleCancelLogin = () => {
    loginDialogRef.current?.setVisible(false)
  }
  const handleHideLogin = () => {
    setLoginVisible(false)
    setPassword('')
    setCaptcha('')
    setLoginStatus('')
    setLoading(false)
  }

  const handleSendCaptcha = async() => {
    const targetPhone = phone.trim()
    const targetCountrycode = countrycode.trim() || '86'
    if (!targetPhone) {
      toast(t('setting_basic_netease_login_phone_required'))
      return
    }

    setLoading(true)
    setLoginStatus(t('setting_basic_netease_login_captcha_sending'))
    try {
      const result = await sendPhoneCaptcha({
        phone: targetPhone,
        countrycode: targetCountrycode,
      })
      setLoginStatus(result?.code == 200 ? t('setting_basic_netease_login_captcha_sent') : String(result?.message || result?.msg || t('setting_basic_netease_login_failed')))
    } catch (err) {
      setLoginStatus(String((err as Error)?.message || t('setting_basic_netease_login_failed')))
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async() => {
    const targetPhone = phone.trim()
    const targetCountrycode = countrycode.trim() || '86'
    const targetPassword = password.trim()
    const targetCaptcha = captcha.trim()
    if (!targetPhone) {
      toast(t('setting_basic_netease_login_phone_required'))
      return
    }
    if (!targetPassword && !targetCaptcha) {
      toast(t('setting_basic_netease_login_password_required'))
      return
    }

    setLoading(true)
    setLoginStatus(t('setting_basic_netease_login_logging_in'))
    try {
      const result = await loginByPhone({
        phone: targetPhone,
        password: targetPassword,
        captcha: targetCaptcha,
        countrycode: targetCountrycode,
      })
      if (result?.code == 200 && result.cookie) {
        updateSetting({ 'common.neteaseCookie': result.cookie })
        setLoginStatus(t('setting_basic_netease_login_success'))
        handleCancelLogin()
      } else if (result?.code == 200) {
        setLoginStatus(t('setting_basic_netease_login_no_cookie'))
      } else {
        setLoginStatus(String(result?.message || result?.msg || t('setting_basic_netease_login_failed')))
      }
    } catch (err) {
      setLoginStatus(String((err as Error)?.message || t('setting_basic_netease_login_failed')))
    } finally {
      setLoading(false)
    }
  }

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
                  <Text style={styles.inputLabel} size={13} color={theme['c-600']}>{t('setting_basic_netease_login_countrycode')}</Text>
                  <Input
                    value={countrycode}
                    onChangeText={setCountrycode}
                    keyboardType="phone-pad"
                    style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
                    placeholder="86"
                  />
                  <Text style={styles.inputLabel} size={13} color={theme['c-600']}>{t('setting_basic_netease_login_phone')}</Text>
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
                    placeholder={t('setting_basic_netease_login_phone_placeholder')}
                  />
                  <Text style={styles.inputLabel} size={13} color={theme['c-600']}>{t('setting_basic_netease_login_password')}</Text>
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
                    placeholder={t('setting_basic_netease_login_password_placeholder')}
                  />
                  <Text style={styles.inputLabel} size={13} color={theme['c-600']}>{t('setting_basic_netease_login_captcha')}</Text>
                  <Input
                    value={captcha}
                    onChangeText={setCaptcha}
                    keyboardType="number-pad"
                    style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
                    placeholder={t('setting_basic_netease_login_captcha_placeholder')}
                  />
                  <Text style={styles.loginStatus} size={13} color={theme['c-600']}>{loginStatus}</Text>
                </View>
                <View style={styles.dialogBtns}>
                  <Button disabled={loading} onPress={handleSendCaptcha}>{t('setting_basic_netease_login_captcha_btn')}</Button>
                  <Button disabled={loading} onPress={handleLogin}>{t('setting_basic_netease_login_submit')}</Button>
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
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 8,
  },
  inputLabel: {
    alignSelf: 'stretch',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    alignSelf: 'stretch',
    height: 36,
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  loginStatus: {
    marginTop: 12,
    textAlign: 'center',
  },
  dialogBtns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    paddingLeft: 15,
  },
})
