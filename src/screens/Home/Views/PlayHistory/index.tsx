import { memo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { clearPlayHistory, playHistoryList, removePlayHistory } from '@/core/player/playHistory'
import { useI18n } from '@/lang'
import { usePlayHistory, usePlayMusicInfo } from '@/store/player/hook'
import { useSourceNames } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { confirmDialog, createStyle, toast } from '@/utils/tools'
import Section from '../Setting/components/Section'

const getSourceName = (
  musicInfo: LX.Music.MusicInfo | LX.Download.ListItem,
  sourceNames: Record<string, string>,
) => {
  const source = 'metadata' in musicInfo
    ? musicInfo.metadata.musicInfo.source
    : musicInfo.source
  return sourceNames[source] || (source == 'local' ? 'Local' : source)
}
const getMusicName = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  return 'metadata' in musicInfo ? musicInfo.metadata.musicInfo.name : musicInfo.name
}
const getMusicSinger = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  return 'metadata' in musicInfo ? musicInfo.metadata.musicInfo.singer : musicInfo.singer
}

const HistoryItem = ({
  index,
  info,
  active,
  onPress,
  onRemove,
}: {
  index: number
  info: LX.Player.PlayMusicInfo
  active: boolean
  onPress: () => void
  onRemove: () => void
}) => {
  const theme = useTheme()
  const sourceNames = useSourceNames()
  const sourceName = getSourceName(info.musicInfo, sourceNames)
  const name = getMusicName(info.musicInfo)
  const singer = getMusicSinger(info.musicInfo)

  return (
    <View
      style={{
        ...styles.item,
        backgroundColor: active ? theme['c-primary-light-100-alpha-300'] : 'transparent',
      }}
    >
      <TouchableOpacity style={styles.itemLeft} onPress={onPress}>
        {
          active
            ? <Icon style={styles.index} name="play-outline" size={13} color={theme['c-primary-font-active']} />
            : <Text style={styles.index} size={12} color={theme['c-font-label']}>{index + 1}</Text>
        }
        <View style={styles.info}>
          <Text numberOfLines={1} size={14} color={active ? theme['c-primary-font-active'] : theme['c-font']}>{name}</Text>
          <Text numberOfLines={1} size={12} color={theme['c-font-label']}>{singer || '-'}</Text>
        </View>
        <Text style={styles.source} numberOfLines={1} size={11} color={theme['c-font-label']}>{sourceName}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
        <Icon name="remove" color={theme['c-font-label']} size={12} />
      </TouchableOpacity>
    </View>
  )
}

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const playHistory = usePlayHistory()
  const playMusicInfo = usePlayMusicInfo()

  const handleClearHistory = () => {
    void confirmDialog({
      message: t('play_history_clear_confirm'),
      confirmButtonText: t('list_remove_tip_button'),
    }).then(isClear => {
      if (!isClear) return
      clearPlayHistory()
      toast(t('play_history_clear_success'))
    })
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <Section title={t('nav_play_history')}>
        <Text style={styles.desc} size={12} color={theme['c-font-label']}>{t('play_history_desc')}</Text>
        <View style={styles.header}>
          <Text size={12} color={theme['c-font-label']}>{t('play_history_count', { num: playHistory.length })}</Text>
          {playHistory.length
            ? <TouchableOpacity onPress={handleClearHistory}>
                <Text size={12} color={theme['c-primary-font-active']}>{t('play_history_clear')}</Text>
              </TouchableOpacity>
            : null}
        </View>
        {playHistory.length
          ? playHistory.map((info, index) => (
              <HistoryItem
                key={`${info.musicInfo.id}_${index}`}
                index={index}
                info={info}
                active={playMusicInfo.musicInfo?.id == info.musicInfo.id}
                onPress={() => { playHistoryList(index) }}
                onRemove={() => { removePlayHistory(index) }}
              />
          ))
          : <Text style={styles.empty} size={12} color={theme['c-font-label']}>{t('play_history_empty')}</Text>}
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
  header: {
    height: 32,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  desc: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    lineHeight: 20,
  },
  item: {
    minHeight: 48,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLeft: {
    flex: 1,
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
  source: {
    width: 54,
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
    paddingVertical: 16,
    textAlign: 'center',
  },
})
