import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { clearListMusics, removeListMusics } from '@/core/list'
import { clearPlayHistory, removePlayHistory } from '@/core/player/playHistory'
import { playList, playNext } from '@/core/player/player'
import { addTempPlayList, clearTempPlayeList, removeTempPlayList } from '@/core/player/tempPlayList'
import { usePlayHistory, usePlayInfo, usePlayMusicInfo, useTempPlayList } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { getListMusicSync } from '@/utils/listManage'
import { confirmDialog, createStyle, toast } from '@/utils/tools'

export interface PlayQueueModalType {
  show: () => void
}

const MusicItem = ({
  index,
  musicInfo,
  active,
  suffix,
  onPress,
  onRemove,
}: {
  index: number
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem
  active: boolean
  suffix?: string
  onPress: () => void
  onRemove?: () => void
}) => {
  const theme = useTheme()

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      style={{
        ...styles.item,
        backgroundColor: active ? theme['c-primary-light-100-alpha-300'] : 'transparent',
      }}
      onPress={onPress}
    >
      <Text style={styles.index} size={12} color={active ? theme['c-primary-font-active'] : theme['c-font-label']}>{index + 1}</Text>
      <View style={styles.info}>
        <Text numberOfLines={1} size={14} color={active ? theme['c-primary-font-active'] : theme['c-font']}>{musicInfo.name}</Text>
        <Text numberOfLines={1} size={12} color={theme['c-font-label']}>{musicInfo.singer || '-'}</Text>
      </View>
      {suffix ? <Text style={styles.suffix} numberOfLines={1} size={11} color={theme['c-font-label']}>{suffix}</Text> : null}
      {onRemove
        ? <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <Icon name="remove" color={theme['c-font-label']} size={12} />
          </TouchableOpacity>
        : null}
    </TouchableOpacity>
  )
}

export default forwardRef<PlayQueueModalType>((_, ref) => {
  const theme = useTheme()
  const dialogRef = useRef<DialogType>(null)
  const playInfo = usePlayInfo()
  const playMusicInfo = usePlayMusicInfo()
  const tempPlayList = useTempPlayList()
  const playHistory = usePlayHistory()
  const [list, setList] = useState<Array<LX.Music.MusicInfo | LX.Download.ListItem>>([])

  const refreshList = useCallback(() => {
    setList(playInfo.playerListId ? [...getListMusicSync(playInfo.playerListId)] : [])
  }, [playInfo.playerListId])

  useEffect(() => {
    refreshList()
  }, [refreshList, playMusicInfo.musicInfo])

  useEffect(() => {
    const handleListUpdate = (ids: string[]) => {
      if (!playInfo.playerListId || !ids.includes(playInfo.playerListId)) return
      refreshList()
    }
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [playInfo.playerListId, refreshList])

  useImperativeHandle(ref, () => ({
    show() {
      dialogRef.current?.setVisible(true)
    },
  }))

  const handleClearTemp = () => {
    clearTempPlayeList()
    toast('已清空稍后播放')
  }

  const handlePlayTemp = (info: LX.Player.PlayMusicInfo, index: number) => {
    removeTempPlayList(index)
    addTempPlayList([{ listId: info.listId, musicInfo: info.musicInfo, isTop: true }])
    void playNext()
    dialogRef.current?.setVisible(false)
  }

  const handlePlayListMusic = (index: number) => {
    if (!playInfo.playerListId) return
    void playList(playInfo.playerListId, index)
    dialogRef.current?.setVisible(false)
  }

  const handlePlayHistory = (info: LX.Player.PlayMusicInfo) => {
    addTempPlayList([{ listId: info.listId, musicInfo: info.musicInfo, isTop: true }])
    void playNext()
    dialogRef.current?.setVisible(false)
  }

  const handleClearHistory = () => {
    clearPlayHistory()
    toast('已清空播放历史')
  }

  const handleClearList = () => {
    if (!playInfo.playerListId || !list.length) return
    void confirmDialog({
      message: `确定清空当前歌单的 ${list.length} 首歌曲吗？`,
      confirmButtonText: '清空',
    }).then(isClear => {
      if (!isClear || !playInfo.playerListId) return
      void clearListMusics([playInfo.playerListId]).then(() => {
        refreshList()
        toast('已清空当前歌单')
      })
    })
  }

  const handleRemoveListMusic = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
    if (!playInfo.playerListId) return
    void removeListMusics(playInfo.playerListId, [musicInfo.id]).then(() => {
      refreshList()
      toast('已从当前歌单删除')
    })
  }

  return (
    <Dialog ref={dialogRef} title="播放队列" height="78%">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text size={12} color={theme['c-font-label']}>稍后播放 {tempPlayList.length}</Text>
          {tempPlayList.length
            ? <TouchableOpacity onPress={handleClearTemp}>
                <Text size={12} color={theme['c-primary-font-active']}>清空</Text>
              </TouchableOpacity>
            : null}
        </View>
        {tempPlayList.length
          ? <ScrollView style={styles.tempList}>
              {tempPlayList.map((info, index) => (
                <MusicItem
                  key={`${info.musicInfo.id}_${index}`}
                  index={index}
                  musicInfo={info.musicInfo}
                  active={playMusicInfo.isTempPlay && playMusicInfo.musicInfo?.id == info.musicInfo.id}
                  suffix="稍后"
                  onPress={() => { handlePlayTemp(info, index) }}
                  onRemove={() => { removeTempPlayList(index) }}
                />
              ))}
            </ScrollView>
          : <Text style={styles.emptyCompact} size={12} color={theme['c-font-label']}>暂无稍后播放</Text>}

        <View style={styles.header}>
          <Text size={12} color={theme['c-font-label']}>播放历史 {playHistory.length}</Text>
          {playHistory.length
            ? <TouchableOpacity onPress={handleClearHistory}>
                <Text size={12} color={theme['c-primary-font-active']}>清空</Text>
              </TouchableOpacity>
            : null}
        </View>
        {playHistory.length
          ? <ScrollView style={styles.historyList}>
              {playHistory.map((info, index) => (
                <MusicItem
                  key={`${info.musicInfo.id}_${index}`}
                  index={index}
                  musicInfo={info.musicInfo}
                  active={playMusicInfo.musicInfo?.id == info.musicInfo.id}
                  suffix="历史"
                  onPress={() => { handlePlayHistory(info) }}
                  onRemove={() => { removePlayHistory(index) }}
                />
              ))}
            </ScrollView>
          : <Text style={styles.emptyCompact} size={12} color={theme['c-font-label']}>暂无播放历史</Text>}

        <View style={styles.header}>
          <Text size={12} color={theme['c-font-label']}>当前歌单 {list.length}</Text>
          <View style={styles.headerActions}>
            {playInfo.playIndex > -1 ? <Text size={12} color={theme['c-font-label']}>当前第 {playInfo.playIndex + 1} 首</Text> : null}
            {list.length
              ? <TouchableOpacity onPress={handleClearList}>
                  <Text size={12} color={theme['c-primary-font-active']}>清空</Text>
                </TouchableOpacity>
              : null}
          </View>
        </View>
        <ScrollView style={styles.list}>
          {list.length
            ? list.map((musicInfo, index) => (
              <MusicItem
                key={`${musicInfo.id}_${index}`}
                index={index}
                musicInfo={musicInfo}
                active={!playMusicInfo.isTempPlay && playMusicInfo.musicInfo?.id == musicInfo.id}
                onPress={() => { handlePlayListMusic(index) }}
                onRemove={() => { handleRemoveListMusic(musicInfo) }}
              />
            ))
            : <Text style={styles.empty} size={12} color={theme['c-font-label']}>暂无播放歌单</Text>}
        </ScrollView>
      </View>
    </Dialog>
  )
})

const styles = createStyle({
  container: {
    width: '100%',
    minWidth: '85%',
    flex: 1,
  },
  header: {
    height: 32,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tempList: {
    maxHeight: 132,
  },
  historyList: {
    maxHeight: 132,
  },
  list: {
    flex: 1,
  },
  item: {
    minHeight: 44,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  index: {
    width: 32,
    textAlign: 'center',
  },
  info: {
    flex: 1,
    paddingRight: 8,
  },
  suffix: {
    width: 34,
    textAlign: 'right',
    marginRight: 4,
  },
  removeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: 14,
    textAlign: 'center',
  },
  emptyCompact: {
    paddingVertical: 8,
    textAlign: 'center',
  },
})
