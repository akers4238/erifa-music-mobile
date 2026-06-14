import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
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
import wySongListApi from '@/utils/musicSdk/wy/songList'
import type { ListInfoItem } from '@/store/songlist/state'

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

const getWySongId = (musicInfo: LX.Music.MusicInfo) => {
  const targetInfo = musicInfo.meta?.toggleMusicInfo?.source == 'wy' ? musicInfo.meta.toggleMusicInfo : musicInfo
  const songId = targetInfo.source == 'wy' ? targetInfo.meta.songId : null
  return songId ? String(songId) : null
}

export default forwardRef<MusicAddModalType, MusicAddModalProps>(({ onAdded }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const dialogRef = useRef<DialogType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo>(initSelectInfo as SelectInfo)
  const [neteaseLists, setNeteaseLists] = useState<ListInfoItem[]>([])
  const [isLoadingNeteaseLists, setLoadingNeteaseLists] = useState(false)
  const musicInfo = selectInfo.musicInfo
  const showNeteaseActions = useMemo(() => musicInfo ? isWyMusic(musicInfo) : false, [musicInfo])

  useEffect(() => {
    if (!showNeteaseActions) {
      setNeteaseLists([])
      setLoadingNeteaseLists(false)
      return
    }

    let canceled = false
    setLoadingNeteaseLists(true)
    void wySongListApi.getMyList(1).then(({ list }: { list: ListInfoItem[] }) => {
      if (canceled) return
      setNeteaseLists(list)
    }).catch(err => {
      if (canceled) return
      setNeteaseLists([])
      toast(`获取网易云歌单失败：${err?.message || err}`)
    }).finally(() => {
      if (!canceled) setLoadingNeteaseLists(false)
    })

    return () => {
      canceled = true
    }
  }, [showNeteaseActions])

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

  const handleAddToNeteasePlaylist = (listInfo: ListInfoItem) => {
    if (!musicInfo) return
    const songId = getWySongId(musicInfo)
    if (!songId) {
      toast('当前歌曲不是网易云歌曲')
      return
    }

    void wySongListApi.addMusicToPlaylist(listInfo.id, songId).then(() => {
      dialogRef.current?.setVisible(false)
      toast(`已添加至网易云歌单：${listInfo.name}`)
    }).catch(err => {
      toast(`添加至网易云歌单失败：${err?.message || err}`)
    })
  }

  return (
    <Dialog ref={dialogRef} onHide={handleHide}>
      {
        musicInfo
          ? (<>
              <Title musicInfo={musicInfo} isMove={selectInfo.isMove} />
              <List musicInfo={musicInfo} onPress={handleSelect} />
              {showNeteaseActions
                ? <View style={styles.neteaseAction}>
                    <Text style={styles.neteaseTitle} size={12} color={theme['c-font-label']}>网易云歌单</Text>
                    <Button
                      style={{ ...styles.neteaseButton, backgroundColor: theme['c-button-background'], borderColor: theme['c-primary-light-400-alpha-300'] }}
                      onPress={handleAddToNeteaseLove}
                    >
                      <Text numberOfLines={1} size={14} color={theme['c-button-font']}>添加至网易云我的喜欢</Text>
                    </Button>
                    {
                      isLoadingNeteaseLists
                        ? <Text style={styles.neteaseTip} size={12} color={theme['c-font-label']}>正在获取网易云歌单...</Text>
                        : neteaseLists.length
                          ? neteaseLists.map(listInfo => (
                              <Button
                                key={listInfo.id}
                                style={{ ...styles.neteaseButton, backgroundColor: theme['c-button-background'], borderColor: theme['c-primary-light-400-alpha-300'] }}
                                onPress={() => { handleAddToNeteasePlaylist(listInfo) }}
                              >
                                <Text numberOfLines={1} size={14} color={theme['c-button-font']}>添加至：{listInfo.name}</Text>
                              </Button>
                          ))
                          : <Text style={styles.neteaseTip} size={12} color={theme['c-font-label']}>暂无可添加的网易云歌单</Text>
                    }
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
  neteaseTitle: {
    paddingBottom: 8,
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
    marginBottom: 10,
  },
  neteaseTip: {
    paddingBottom: 10,
    textAlign: 'center',
  },
})
