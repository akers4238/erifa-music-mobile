import { memo } from 'react'

import SubTitle from '../../components/SubTitle'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import WebCookieLogin, { type LoginSettingKey } from './WebCookieLogin'

const LOGIN_ITEMS = [
  {
    id: 'qq',
    settingKey: 'common.qqMusicCookie',
    loginUrl: 'https://y.qq.com/',
    cookieUrls: [
      'https://y.qq.com',
      'https://u.y.qq.com',
      'https://c.y.qq.com',
      'https://i.y.qq.com',
    ],
    requiredKeys: ['uin', 'qqmusic_key', 'qm_keyst', 'p_uin'],
  },
  {
    id: 'bilibili',
    settingKey: 'common.bilibiliCookie',
    loginUrl: 'https://passport.bilibili.com/login',
    cookieUrls: [
      'https://www.bilibili.com',
      'https://passport.bilibili.com',
      'https://api.bilibili.com',
    ],
    requiredKeys: ['SESSDATA', 'bili_jct', 'DedeUserID'],
  },
  {
    id: 'youtube',
    settingKey: 'common.youtubeCookie',
    loginUrl: 'https://www.youtube.com/',
    cookieUrls: [
      'https://www.youtube.com',
      'https://accounts.google.com',
      'https://google.com',
    ],
    requiredKeys: ['LOGIN_INFO', 'SID', 'SAPISID', 'VISITOR_INFO1_LIVE'],
  },
] satisfies Array<{
  id: 'qq' | 'bilibili' | 'youtube'
  settingKey: LoginSettingKey
  loginUrl: string
  cookieUrls: string[]
  requiredKeys: readonly string[]
}>

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()

  return (
    <SubTitle title={t('setting_plugin_login_other')}>
      {
        LOGIN_ITEMS.map(item => (
          <WebCookieLogin
            key={item.id}
            title={t(`setting_plugin_login_${item.id}`)}
            loginUrl={item.loginUrl}
            cookieUrls={item.cookieUrls}
            requiredKeys={item.requiredKeys}
            settingKey={item.settingKey}
          />
        ))
      }
      <Text style={styles.tip} size={12} color={theme['c-600']}>{t('setting_plugin_login_other_tip')}</Text>
    </SubTitle>
  )
})

const styles = createStyle({
  tip: {
    marginTop: 12,
  },
})
