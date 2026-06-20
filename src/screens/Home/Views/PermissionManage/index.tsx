import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, ScrollView, View } from 'react-native'

import Text from '@/components/common/Text'
import { checkDesktopLyricOverlayPermission, openDesktopLyricOverlayPermissionActivity } from '@/core/desktopLyric'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { isIgnoringBatteryOptimization, isNotificationsEnabled, requestIgnoreBatteryOptimization, requestNotificationPermission } from '@/utils/nativeModules/utils'
import { checkStoragePermissions, createStyle, requestStoragePermission, toast } from '@/utils/tools'
import Button from '../Setting/components/Button'
import Section from '../Setting/components/Section'

type PermissionStatus = boolean | null

interface PermissionItem {
  id: string
  title: string
  desc: string
  status: PermissionStatus
  onRequest: () => void
}

const PermissionRow = memo(({ title, desc, status, onRequest }: PermissionItem) => {
  const t = useI18n()
  const theme = useTheme()
  const statusText = status == null
    ? t('permission_manage_checking')
    : status
      ? t('permission_manage_status_granted')
      : t('permission_manage_status_denied')
  const statusColor = status
    ? theme['c-primary-font-active']
    : theme['c-font-label']

  return (
    <View style={styles.item}>
      <View style={styles.itemInfo}>
        <Text size={14} color={theme['c-font']}>{title}</Text>
        <Text style={styles.desc} size={12} color={theme['c-font-label']}>{desc}</Text>
      </View>
      <View style={styles.itemAction}>
        <Text style={styles.status} size={12} color={statusColor}>{statusText}</Text>
        <Button disabled={status == null} onPress={onRequest}>{t('permission_manage_request')}</Button>
      </View>
    </View>
  )
})

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const [notification, setNotification] = useState<PermissionStatus>(null)
  const [battery, setBattery] = useState<PermissionStatus>(null)
  const [storage, setStorage] = useState<PermissionStatus>(null)
  const [overlay, setOverlay] = useState<PermissionStatus>(null)

  const refresh = useCallback(() => {
    setNotification(null)
    setBattery(null)
    setStorage(null)
    setOverlay(null)
    void isNotificationsEnabled().then(setNotification).catch(() => { setNotification(false) })
    void isIgnoringBatteryOptimization().then(setBattery).catch(() => { setBattery(false) })
    void checkStoragePermissions().then(setStorage).catch(() => { setStorage(false) })
    void checkDesktopLyricOverlayPermission()
      .then(() => { setOverlay(true) })
      .catch(() => { setOverlay(false) })
  }, [])

  useEffect(() => {
    refresh()
    const subscription = AppState.addEventListener('change', state => {
      if (state == 'active') refresh()
    })
    return () => {
      subscription.remove()
    }
  }, [refresh])

  const items = useMemo<PermissionItem[]>(() => [
    {
      id: 'notification',
      title: t('permission_manage_notification'),
      desc: t('permission_manage_notification_desc'),
      status: notification,
      onRequest() {
        void requestNotificationPermission().then(refresh)
      },
    },
    {
      id: 'battery',
      title: t('permission_manage_battery'),
      desc: t('permission_manage_battery_desc'),
      status: battery,
      onRequest() {
        void requestIgnoreBatteryOptimization().then(refresh)
      },
    },
    {
      id: 'storage',
      title: t('permission_manage_storage'),
      desc: t('permission_manage_storage_desc'),
      status: storage,
      onRequest() {
        void requestStoragePermission().then(result => {
          if (!result) toast(t(result == null ? 'storage_permission_tip_disagree_ask_again' : 'storage_permission_tip_disagree'), 'long')
          refresh()
        })
      },
    },
    {
      id: 'desktopLyric',
      title: t('permission_manage_desktop_lyric'),
      desc: t('permission_manage_desktop_lyric_desc'),
      status: overlay,
      onRequest() {
        void openDesktopLyricOverlayPermissionActivity().finally(refresh)
      },
    },
  ], [battery, notification, overlay, refresh, storage, t])

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <Section title={t('nav_permission_manage')}>
        <Text style={styles.tip} size={12} color={theme['c-font-label']}>{t('permission_manage_tip')}</Text>
        {items.map(item => (
          <PermissionRow key={item.id} {...item} />
        ))}
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
  tip: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    lineHeight: 20,
  },
  item: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  desc: {
    marginTop: 4,
    lineHeight: 18,
  },
  itemAction: {
    alignItems: 'flex-end',
  },
  status: {
    marginBottom: 6,
  },
})
