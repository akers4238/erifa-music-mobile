import { memo, useRef, useState } from 'react'
import { View } from 'react-native'

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

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const cookie = useSettingValue('common.neteaseCookie')
  const dialogRef = useRef<DialogType>(null)
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState(cookie)

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

  return (
    <SubTitle title={t('setting_basic_netease_cookie')}>
      <View style={styles.btn}>
        <Button onPress={handleShow}>{t(cookie ? 'setting_basic_netease_cookie_btn_edit' : 'setting_basic_netease_cookie_btn_add')}</Button>
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
  dialogBtns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    paddingLeft: 15,
  },
})
