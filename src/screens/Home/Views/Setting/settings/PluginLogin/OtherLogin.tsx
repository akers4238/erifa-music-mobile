import { memo } from 'react'
import { View } from 'react-native'

import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import WebCookieLogin, { type LoginSettingKey } from './WebCookieLogin'

const androidChromeUserAgent = 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

const LOGIN_ITEMS = [
  {
    id: 'bilibili',
    settingKey: 'common.bilibiliCookie',
    loginUrl: 'https://passport.bilibili.com/login',
    userAgent: androidChromeUserAgent,
    cookieUrls: [
      'https://www.bilibili.com',
      'https://passport.bilibili.com',
      'https://api.bilibili.com',
    ],
    requiredKeys: ['SESSDATA', 'bili_jct', 'DedeUserID'],
  },
] satisfies Array<{
  id: 'bilibili'
  settingKey: LoginSettingKey
  loginUrl: string
  userAgent: string
  cookieUrls: string[]
  requiredKeys: readonly string[]
}>

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()

  return (
    <View style={styles.container}>
      {
        LOGIN_ITEMS.map(item => (
          <WebCookieLogin
            key={item.id}
            title={t(`setting_plugin_login_${item.id}`)}
            loginUrl={item.loginUrl}
            userAgent={item.userAgent}
            cookieUrls={item.cookieUrls}
            requiredKeys={item.requiredKeys}
            settingKey={item.settingKey}
          />
        ))
      }
      <Text style={styles.tip} size={12} color={theme['c-600']}>{t('setting_plugin_login_other_tip')}</Text>
    </View>
  )
})

const styles = createStyle({
  container: {
    paddingLeft: 25,
    marginBottom: 18,
  },
  tip: {
    marginTop: 12,
  },
})
