import { memo } from 'react'

import Section from '../../components/Section'
import { useI18n } from '@/lang/i18n'
import NeteaseCookie from '../Basic/NeteaseCookie'
import Source from '../Basic/Source'
import OtherLogin from './OtherLogin'

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_plugin_login')}>
      <Source />
      <NeteaseCookie />
      <OtherLogin />
    </Section>
  )
})
