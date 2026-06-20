import { memo, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'

import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import listState from '@/store/list/state'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Button from '../Setting/components/Button'
import Section from '../Setting/components/Section'
import { handleImportMediaFile } from '../Mylist/MyList/listAction'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const choosePathRef = useRef<ChoosePathType>(null)
  const [visible, setVisible] = useState(false)

  const handleSelectFolder = () => {
    if (visible) {
      choosePathRef.current?.show({
        title: t('list_select_local_file_desc'),
        dirOnly: true,
        isPersist: true,
      })
      return
    }
    setVisible(true)
    requestAnimationFrame(() => {
      choosePathRef.current?.show({
        title: t('list_select_local_file_desc'),
        dirOnly: true,
        isPersist: true,
      })
    })
  }

  const onConfirmPath = (path: string) => {
    void handleImportMediaFile(listState.defaultList, path)
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <Section title={t('nav_local_music')}>
        <Text style={styles.desc} size={12} color={theme['c-font-label']}>{t('local_music_desc')}</Text>
        <View style={styles.action}>
          <Button onPress={handleSelectFolder}>{t('local_music_select_folder')}</Button>
        </View>
        <Text style={styles.target} size={12} color={theme['c-font-label']}>
          {t('local_music_target_list', { name: t('list_name_default') })}
        </Text>
      </Section>
      {visible ? <ChoosePath ref={choosePathRef} onConfirm={onConfirmPath} /> : null}
    </ScrollView>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    paddingTop: 15,
    paddingHorizontal: 10,
  },
  desc: {
    paddingHorizontal: 14,
    lineHeight: 20,
  },
  action: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  target: {
    paddingHorizontal: 14,
    lineHeight: 18,
  },
})
