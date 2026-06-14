import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { playList, playNext } from '@/core/player/player'
import { addTempPlayList, clearTempPlayeList, removeTempPlayList } from '@/core/player/tempPlayList'
import { usePlayInfo, usePlayMusicInfo, useTempPlayList } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { getListMusicSync } from '@/utils/listManage'
import { createStyle, toast } from '@/utils/tools'

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
        backgroundColor: active ? theme['c-primary-light-100-alpha-100'] : 'transparent',
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

  const list = useMemo(() => playInfo.playerListId ? getListMusicSync(playInfo.playerListId) : [], [playInfo.playerListId, playMusicInfo.musicInfo])

  useImperativeHandle(ref, () => ({
    show() {
      dialogRef.current?.setVisible(true)
    },
  }))

  const handleClearTemp = () => {
    clearTempPlayeList()
    toast('Queue cleared')
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

  return (
    <Dialog ref={dialogRef} title="Play queue" height="78%">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text size={12} color={theme['c-font-label']}>Play later {tempPlayList.length}</Text>
          {tempPlayList.length
            ? <TouchableOpacity onPress={handleClearTemp}>
                <Text size={12} color={theme['c-primary-font-active']}>Clear</Text>
              </TouchableOpacity>
            : null}
        </View>
        <ScrollView style={styles.tempList}>
          {tempPlayList.length
            ? tempPlayList.map((info, index) => (
              <MusicItem
                key={`${info.musicInfo.id}_${index}`}
                index={index}
                musicInfo={info.musicInfo}
                active={playMusicInfo.isTempPlay && playMusicInfo.musicInfo?.id == info.musicInfo.id}
                suffix="Next"
                onPress={() => { handlePlayTemp(info, index) }}
                onRemove={() => { removeTempPlayList(index) }}
              />
            ))
            : <Text style={styles.empty} size={12} color={theme['c-font-label']}>No play later items</Text>}
        </ScrollView>

        <View style={styles.header}>
          <Text size={12} color={theme['c-font-label']}>Playlist {list.length}</Text>
          {playInfo.playIndex > -1 ? <Text size={12} color={theme['c-font-label']}>Current #{playInfo.playIndex + 1}</Text> : null}
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
              />
            ))
            : <Text style={styles.empty} size={12} color={theme['c-font-label']}>No playlist</Text>}
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
  tempList: {
    maxHeight: 150,
  },
  list: {
    flex: 1,
  },
  item: {
    minHeight: 48,
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
})
