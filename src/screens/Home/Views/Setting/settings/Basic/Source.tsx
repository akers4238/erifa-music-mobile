import { memo, useRef } from 'react'
import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import Button from '../../components/Button'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import UserApiEditModal, { type UserApiEditModalType } from './UserApiEditModal'

export default memo(() => {
  const t = useI18n()
  const modalRef = useRef<UserApiEditModalType>(null)

  const handleShow = () => {
    modalRef.current?.show()
  }

  return (
    <SubTitle title={t('setting_basic_source')}>
      <View style={styles.btn}>
        <Button onPress={handleShow}>{t('setting_basic_source_musicfree_btn')}</Button>
      </View>
      <UserApiEditModal ref={modalRef} />
    </SubTitle>
  )
})

const styles = createStyle({
  btn: {
    marginTop: 10,
    flexDirection: 'row',
  },
})
