import { memo } from 'react'
import { ScrollView } from 'react-native'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import Section from '../Setting/components/Section'
import UserApiManager from '../Setting/settings/Basic/UserApiEditModal/UserApiManager'
import NeteaseCookie from '../Setting/settings/Basic/NeteaseCookie'
import OtherLogin from '../Setting/settings/PluginLogin/OtherLogin'

export default memo(() => {
  const t = useI18n()

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <Section title={t('nav_plugin_manage')}>
        <UserApiManager />
        <NeteaseCookie />
        <OtherLogin />
      </Section>
    </ScrollView>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    paddingTop: 15,
    paddingHorizontal: 10,
  },
})
