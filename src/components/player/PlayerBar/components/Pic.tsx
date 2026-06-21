import { useCallback, useRef } from 'react'
import RNFS from 'react-native-fs'
import { StyleSheet, TouchableOpacity } from 'react-native'
import { navigations } from '@/navigation'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'
import Menu, { type MenuType } from '@/components/common/Menu'
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
  const coverBtnRef = useRef<TouchableOpacity>(null)
  const menuRef = useRef<MenuType>(null)

  const handlePress = () => {
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)
  }

  const handleLongPress = () => {
    coverBtnRef.current?.measure?.((fx, fy, width, height, px, py) => {
      if (!menuRef.current) return
      menuRef.current.show({ x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }

  const handleMenuPress = ({ action }: { action: string }) => {
    switch (action) {
      case 'save_cover':
        handleSaveCover()
        break
      case 'jump_list':
        global.app_event.jumpListPosition()
        break
    }
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
      await mkdir(publicDir)
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

  const showJumpList = (() => {
    if (!isHome) return false
    const listId = playerState.playMusicInfo.listId
    return !!(listId && listId !== LIST_IDS.DOWNLOAD)
  })()

  return (
    <>
      <TouchableOpacity ref={coverBtnRef} onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7}>
        <Image url={musicInfo.pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={styles.image} onError={handleError} />
      </TouchableOpacity>
      <Menu
        ref={menuRef}
        menus={
          showJumpList
            ? [
                { action: 'save_cover', label: t('player_pic_save_cover') },
                { action: 'jump_list', label: t('player_pic_jump_list') },
              ]
            : [
                { action: 'save_cover', label: t('player_pic_save_cover') },
              ]
        }
        onPress={handleMenuPress}
      />
    </>
  )
}
