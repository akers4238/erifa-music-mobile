import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { View } from 'react-native'
import Button from '@/components/common/Button'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import Text from '@/components/common/Text'
import { createStyle, toast } from '@/utils/tools'
import Title from './Title'
import List from './List'
import { useI18n } from '@/lang'
import { addListMusics, moveListMusics, syncWyLoveMusic } from '@/core/list'
import settingState from '@/store/setting/state'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo | null
  listId: string
  isMove: boolean
  // single: boolean
}
const initSelectInfo = {}

export interface MusicAddModalProps {
  onAdded?: () => void
  // onRename: (listInfo: LX.List.UserListInfo) => void
  // onImport: (listInfo: LX.List.MyListInfo, index: number) => void
  // onExport: (listInfo: LX.List.MyListInfo, index: number) => void
  // onSync: (listInfo: LX.List.UserListInfo) => void
  // onRemove: (listInfo: LX.List.UserListInfo) => void
}
export interface MusicAddModalType {
  show: (info: SelectInfo) => void
}

const isWyMusic = (musicInfo: LX.Music.MusicInfo) => {
  return musicInfo.source == 'wy' || musicInfo.meta?.toggleMusicInfo?.source == 'wy'
}

export default forwardRef<MusicAddModalType, MusicAddModalProps>(({ onAdded }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const dialogRef = useRef<DialogType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo>(initSelectInfo as SelectInfo)

  useImperativeHandle(ref, () => ({
    show(selectInfo) {
      setSelectInfo(selectInfo)

      requestAnimationFrame(() => {
        dialogRef.current?.setVisible(true)
      })
    },
  }))

  const handleHide = () => {
    requestAnimationFrame(() => {
      setSelectInfo({ ...selectInfo, musicInfo: null })
    })
  }

  const handleSelect = (listInfo: LX.List.MyListInfo) => {
    dialogRef.current?.setVisible(false)
    if (selectInfo.isMove) {
      void moveListMusics(selectInfo.listId, listInfo.id,
        [selectInfo.musicInfo!],
        settingState.setting['list.addMusicLocationType'],
      ).then(() => {
        onAdded?.()
        toast(t('list_edit_action_tip_move_success'))
      }).catch(() => {
        toast(t('list_edit_action_tip_move_failed'))
      })
    } else {
      void addListMusics(listInfo.id,
        [selectInfo.musicInfo!],
        settingState.setting['list.addMusicLocationType'],
      ).then(() => {
        onAdded?.()
        toast(t('list_edit_action_tip_add_success'))
      }).catch(() => {
        toast(t('list_edit_action_tip_add_failed'))
      })
    }
  }

  const handleAddToNeteaseLove = () => {
    const musicInfo = selectInfo.musicInfo
    if (!musicInfo) return
    void syncWyLoveMusic([musicInfo], true).then((synced) => {
      if (synced) {
        dialogRef.current?.setVisible(false)
        toast('已添加至网易云我的喜欢')
      } else {
        toast('当前歌曲不是网易云歌曲')
      }
    }).catch(err => {
      toast(`添加至网易云我的喜欢失败：${err?.message || err}`)
    })
  }

  return (
    <Dialog ref={dialogRef} onHide={handleHide}>
      {
        selectInfo.musicInfo
          ? (<>
              <Title musicInfo={selectInfo.musicInfo} isMove={selectInfo.isMove} />
              <List musicInfo={selectInfo.musicInfo} onPress={handleSelect} />
              {isWyMusic(selectInfo.musicInfo)
                ? <View style={styles.neteaseAction}>
                    <Button
                      style={{ ...styles.neteaseButton, backgroundColor: theme['c-button-background'], borderColor: theme['c-primary-light-400-alpha-300'] }}
                      onPress={handleAddToNeteaseLove}
                    >
                      <Text numberOfLines={1} size={14} color={theme['c-button-font']}>添加至网易云我的喜欢</Text>
                    </Button>
                  </View>
                : null}
            </>)
          : null
      }
    </Dialog>
  )
})

const styles = createStyle({
  neteaseAction: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 12,
  },
  neteaseButton: {
    height: 36,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BorderWidths.normal1,
  },
})
