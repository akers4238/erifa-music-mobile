import { View } from 'react-native'
import { useI18n } from '@/lang'
import { toast, tipDialog, requestStoragePermission } from '@/utils/tools'
import { downloadFile, scanFile, mkdir, externalStorageDirectoryPath, temporaryDirectoryPath } from '@/utils/fs'
import { usePlayerMusicInfo } from '@/store/player/hook'
import RNFS from 'react-native-fs'
import Text from '@/components/common/Text'
import ButtonPrimary from '@/components/common/ButtonPrimary'
import styles from './style'

export default () => {
  const t = useI18n()
  const musicInfo = usePlayerMusicInfo()

  const handleSave = async() => {
    const picUrl = musicInfo.pic
    if (!picUrl) {
      void tipDialog({ message: t('player_pic_no_cover') })
      return
    }

    const granted = await requestStoragePermission()
    if (!granted) {
      toast(t('download_music_permission_denied'))
      return
    }

    try {
      const fileName = `cover_${Date.now()}.jpg`
      const tempPath = `${temporaryDirectoryPath}/${fileName}`

      const sourceUrl = typeof picUrl === 'string' ? picUrl : ''
      if (!sourceUrl) return

      if (/^https?:\/\//i.test(sourceUrl)) {
        const { promise } = downloadFile(sourceUrl, tempPath)
        const result = await promise
        if (result.statusCode && result.statusCode >= 400) throw new Error(`HTTP ${result.statusCode}`)
      } else if (sourceUrl.startsWith('file://')) {
        await RNFS.copyFile(sourceUrl.replace('file://', ''), tempPath)
      } else {
        return
      }

      const publicDir = `${externalStorageDirectoryPath}/Pictures/EMusic`
      await mkdir(publicDir).catch(() => {})
      const savePath = `${publicDir}/${fileName}`
      await RNFS.copyFile(tempPath, savePath)

      scanFile(savePath)

      RNFS.unlink(tempPath).catch(() => {})

      toast(t('player_pic_save_cover_success'))
    } catch (error) {
      console.warn('Save cover failed:', error)
      toast(t('player_pic_save_cover_failed'))
    }
  }

  return (
    <View style={styles.container}>
      <Text>{t('player_pic_save_cover')}</Text>
      <View style={styles.content}>
        <ButtonPrimary onPress={handleSave}>{t('player_pic_save_cover')}</ButtonPrimary>
      </View>
    </View>
  )
}
