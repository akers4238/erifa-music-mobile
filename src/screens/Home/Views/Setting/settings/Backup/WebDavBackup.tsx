import { memo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { getWebDavBackupConfig, saveWebDavBackupConfig, type WebDavBackupConfig } from '@/utils/data'
import { useTheme } from '@/store/theme/hook'
import Button from '../../components/Button'
import { getWebDavBackupFiles, handleWebDavBackupList, handleWebDavRestoreList, type WebDavBackupFile } from './actions'
import { toast } from '@/utils/tools'

const emptyConfig: WebDavBackupConfig = {
  url: '',
  username: '',
  password: '',
  dir: '',
  restorePath: '',
}

const ConfigInput = ({
  label,
  value,
  placeholder,
  secureTextEntry,
  onChangeText,
}: {
  label: string
  value: string
  placeholder?: string
  secureTextEntry?: boolean
  onChangeText: (value: string) => void
}) => {
  const theme = useTheme()

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label} size={14}>{label}</Text>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }} />
    </View>
  )
}

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const dialogRef = useRef<DialogType>(null)
  const [config, setConfig] = useState<WebDavBackupConfig>(emptyConfig)
  const [files, setFiles] = useState<WebDavBackupFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)

  const show = () => {
    void getWebDavBackupConfig().then(info => {
      setConfig(info)
      setFiles([])
      dialogRef.current?.setVisible(true)
    })
  }

  const updateConfig = <K extends keyof WebDavBackupConfig>(key: K, value: WebDavBackupConfig[K]) => {
    setConfig(oldConfig => ({ ...oldConfig, [key]: value }))
  }

  const upload = () => {
    const nextConfig = {
      ...config,
      url: config.url.trim(),
      username: config.username.trim(),
      dir: config.dir.trim() || 'lx-music-mobile/playlist-backup',
    }
    setConfig(nextConfig)
    void saveWebDavBackupConfig(nextConfig)
    handleWebDavBackupList(nextConfig)
    dialogRef.current?.setVisible(false)
  }

  const restore = () => {
    const nextConfig = {
      ...config,
      url: config.url.trim(),
      username: config.username.trim(),
      dir: config.dir.trim() || 'lx-music-mobile/playlist-backup',
      restorePath: config.restorePath.trim(),
    }
    setConfig(nextConfig)
    void saveWebDavBackupConfig(nextConfig)
    handleWebDavRestoreList(nextConfig)
    dialogRef.current?.setVisible(false)
  }

  const loadFiles = () => {
    const nextConfig = {
      ...config,
      url: config.url.trim(),
      username: config.username.trim(),
      dir: config.dir.trim() || 'lx-music-mobile/playlist-backup',
    }
    setConfig(nextConfig)
    void saveWebDavBackupConfig(nextConfig)
    setLoadingFiles(true)
    void getWebDavBackupFiles(nextConfig).then(list => {
      setFiles(list)
      if (!list.length) toast(t('setting_backup_webdav_files_empty'))
    }).catch((err: Error) => {
      toast(`${t('setting_backup_webdav_files_failed')}: ${err.message}`)
    }).finally(() => {
      setLoadingFiles(false)
    })
  }

  const selectFile = (file: WebDavBackupFile) => {
    updateConfig('restorePath', file.path)
    toast(t('setting_backup_webdav_file_selected'))
  }

  return (
    <>
      <Button onPress={show}>{t('setting_backup_webdav')}</Button>
      <Dialog ref={dialogRef} title={t('setting_backup_webdav_title')} height="78%">
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          <ConfigInput
            value={config.url}
            label={t('setting_backup_webdav_url')}
            onChangeText={text => { updateConfig('url', text) }}
            placeholder="https://webdav.123pan.cn/webdav" />
          <ConfigInput
            value={config.username}
            label={t('setting_backup_webdav_username')}
            onChangeText={text => { updateConfig('username', text) }}
            placeholder={t('setting_backup_webdav_username')} />
          <ConfigInput
            value={config.password}
            label={t('setting_backup_webdav_password')}
            onChangeText={text => { updateConfig('password', text) }}
            placeholder={t('setting_backup_webdav_password')}
            secureTextEntry />
          <ConfigInput
            value={config.dir}
            label={t('setting_backup_webdav_dir')}
            onChangeText={text => { updateConfig('dir', text) }}
            placeholder="lx-music-mobile/playlist-backup" />
          <ConfigInput
            value={config.restorePath}
            label={t('setting_backup_webdav_restore_path')}
            onChangeText={text => { updateConfig('restorePath', text) }}
            placeholder="lx-music-mobile/playlist-backup/lx_list_2026-06-19T00-00-00-000Z.json" />
          <Text style={styles.tip} size={12} color={theme['c-font-label']}>{t('setting_backup_webdav_tip')}</Text>
          <View style={styles.actions}>
            <Button onPress={upload}>{t('setting_backup_webdav_upload')}</Button>
            <Button onPress={loadFiles} disabled={loadingFiles}>{loadingFiles ? t('setting_backup_webdav_files_loading') : t('setting_backup_webdav_files_load')}</Button>
            <Button onPress={restore}>{t('setting_backup_webdav_restore')}</Button>
          </View>
          {files.length
            ? <View style={styles.files}>
                {files.map(file => (
                  <Button key={file.path} onPress={() => { selectFile(file) }}>
                    {file.name}
                  </Button>
                ))}
              </View>
            : null}
        </ScrollView>
      </Dialog>
    </>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingRight: 20,
  },
  inputContainer: {
    paddingLeft: 25,
    marginBottom: 15,
  },
  label: {
    marginBottom: 2,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    borderRadius: 4,
    maxWidth: 360,
  },
  tip: {
    paddingLeft: 25,
    paddingRight: 10,
    marginBottom: 16,
  },
  actions: {
    paddingLeft: 25,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  files: {
    paddingLeft: 25,
    paddingTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
})
