import { useCallback } from 'react'
import RNFS from 'react-native-fs'
import { Alert, StyleSheet, TouchableOpacity } from 'react-native'
import { navigations } from '@/navigation'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'
import { useI18n } from '@/lang'
import { toast, tipDialog, requestStoragePermission } from '@/utils/tools'
import { downloadFile, scanFile, mkdir, externalStorageDirectoryPath, temporaryDirectoryPath } from '@/utils/fs'

const PIC_HEIGHT = scaleSizeH(46)

const styles = StyleSheet.create({
  image: {
    width: PIC_HEIGHT,
    height: PIC_HEIGHT,
    borderRadius: 2,
  },
})

export default ({ isHome }: { isHome: boolean }) => {
  const t = useI18n()
  const musicInfo = usePlayerMusicInfo()

  const handlePress = () => {
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)
  }

  const handleLongPress = () => {
    if (!musicInfo.id) return

    const buttons: Array<{ text: string, onPress: () => void }> = [
      { text: t('cancel'), onPress: () => {} },
    ]

    buttons.unshift({
      text: t('player_pic_save_cover'),
      onPress: () => { handleSaveCover() },
    })

    if (isHome) {
      const listId = playerState.playMusicInfo.listId
      if (listId && listId !== LIST_IDS.DOWNLOAD) {
        buttons.unshift({
          text: t('player_pic_jump_list'),
          onPress: () => { global.app_event.jumpListPosition() },
        })
      }
    }

    Alert.alert('', '', buttons)
  }

  const handleSaveCover = async () => {
    const picUrl = musicInfo.pic
    if (!picUrl) {
      tipDialog({ message: t('player_pic_no_cover') })
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

  const handleError = useCallback((url: string | number) => {
    setLoadErrorPicUrl(url as string)
    setMusicInfo({
      pic: null,
    })
  }, [])

  return (
    <TouchableOpacity onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7}>
      <Image url={musicInfo.pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={styles.image} onError={handleError} />
    </TouchableOpacity>
  )
}
