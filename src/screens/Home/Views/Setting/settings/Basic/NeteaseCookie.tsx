import { memo } from 'react'
import { View } from 'react-native'

import InputItem, { type InputItemProps } from '../../components/InputItem'
import { createStyle } from '@/utils/tools'
import { useSettingValue } from '@/store/setting/hook'
import { useI18n } from '@/lang'
import { updateSetting } from '@/core/common'

export default memo(() => {
  const t = useI18n()
  const cookie = useSettingValue('common.neteaseCookie')

  const handleChanged: InputItemProps['onChanged'] = (value, callback) => {
    const newValue = value.trim()
    callback(newValue)
    if (newValue == cookie) return
    updateSetting({ 'common.neteaseCookie': newValue })
  }

  return (
    <View style={styles.content}>
      <InputItem
        value={cookie}
        label={t('setting_basic_netease_cookie')}
        onChanged={handleChanged}
        placeholder={t('setting_basic_netease_cookie_placeholder')}
        clearBtn />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 10,
  },
})
