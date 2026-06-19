import { memo } from 'react'
import { View } from 'react-native'

import Button from '../../components/Button'
import SubTitle from '../../components/SubTitle'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

const LOGIN_ITEMS = [
  'qq',
  'bilibili',
  'youtube',
] as const

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()

  return (
    <SubTitle title={t('setting_plugin_login_other')}>
      <View style={styles.btns}>
        {
          LOGIN_ITEMS.map(id => (
            <Button key={id} disabled>{t(`setting_plugin_login_${id}`)}</Button>
          ))
        }
      </View>
      <Text style={styles.tip} size={12} color={theme['c-600']}>{t('setting_plugin_login_other_tip')}</Text>
    </SubTitle>
  )
})

const styles = createStyle({
  btns: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tip: {
    marginTop: 8,
  },
})
