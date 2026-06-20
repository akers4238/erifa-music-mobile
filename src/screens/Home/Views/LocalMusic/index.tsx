import { memo, useEffect, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import { clearListMusics, getListMusics, removeListMusics } from '@/core/list'
import { playList } from '@/core/player/player'
import { useI18n } from '@/lang'
import { usePlayMusicInfo } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { confirmDialog, createStyle, toast } from '@/utils/tools'
import Button from '../Setting/components/Button'
import Section from '../Setting/components/Section'
import { handleImportMediaFile } from '../Mylist/MyList/listAction'

const localMusicListInfo: LX.List.UserListInfo = {
  id: LIST_IDS.LOCAL_MUSIC,
  name: 'Local Music',
  locationUpdateTime: null,
}

const LocalMusicItem = ({
  item,
  index,
  active,
  onPress,
  onRemove,
}: {
  item: LX.Music.MusicInfo
  index: number
  active: boolean
  onPress: () => void
  onRemove: () => void
}) => {
  const theme = useTheme()

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
          <Text numberOfLines={1} size={14} color={active ? theme['c-primary-font-active'] : theme['c-font']}>{item.name}</Text>
          <Text numberOfLines={1} size={12} color={theme['c-font-label']}>{item.singer || item.meta.filePath}</Text>
        </View>
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
  const choosePathRef = useRef<ChoosePathType>(null)
  const [visible, setVisible] = useState(false)
  const [list, setList] = useState<LX.Music.MusicInfo[]>([])
  const playMusicInfo = usePlayMusicInfo()

  const refreshList = () => {
    void getListMusics(LIST_IDS.LOCAL_MUSIC).then(list => {
      setList([...list])
    })
  }

  useEffect(() => {
    const handleListUpdate = (ids: string[]) => {
      if (ids.includes(LIST_IDS.LOCAL_MUSIC)) refreshList()
    }
    refreshList()
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [])

  const handleSelectFolder = () => {
    if (visible) {
      choosePathRef.current?.show({
        title: t('list_select_local_file_desc'),
        dirOnly: true,
        isPersist: true,
      })
      return
    }
    setVisible(true)
    requestAnimationFrame(() => {
      choosePathRef.current?.show({
        title: t('list_select_local_file_desc'),
        dirOnly: true,
        isPersist: true,
      })
    })
  }

  const handleClear = () => {
    void confirmDialog({
      message: t('local_music_clear_confirm'),
      confirmButtonText: t('list_remove_tip_button'),
    }).then(isClear => {
      if (!isClear) return
      void clearListMusics([LIST_IDS.LOCAL_MUSIC]).then(() => {
        toast(t('local_music_clear_success'))
      })
    })
  }

  const onConfirmPath = (path: string) => {
    void handleImportMediaFile(localMusicListInfo, path)
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <Section title={t('nav_local_music')}>
        <Text style={styles.desc} size={12} color={theme['c-font-label']}>{t('local_music_desc')}</Text>
        <View style={styles.header}>
          <Text size={12} color={theme['c-font-label']}>{t('local_music_count', { num: list.length })}</Text>
          <View style={styles.headerActions}>
            {list.length
              ? <TouchableOpacity onPress={handleClear}>
                  <Text size={12} color={theme['c-primary-font-active']}>{t('local_music_clear')}</Text>
                </TouchableOpacity>
              : null}
            <Button onPress={handleSelectFolder}>{t('local_music_select_folder')}</Button>
          </View>
        </View>
        {list.length
          ? list.map((item, index) => (
              <LocalMusicItem
                key={`${item.id}_${index}`}
                item={item}
                index={index}
                active={playMusicInfo.listId == LIST_IDS.LOCAL_MUSIC && playMusicInfo.musicInfo?.id == item.id}
                onPress={() => { void playList(LIST_IDS.LOCAL_MUSIC, index) }}
                onRemove={() => { void removeListMusics(LIST_IDS.LOCAL_MUSIC, [item.id], false) }}
              />
          ))
          : <Text style={styles.empty} size={12} color={theme['c-font-label']}>{t('local_music_empty')}</Text>}
      </Section>
      {visible ? <ChoosePath ref={choosePathRef} onConfirm={onConfirmPath} /> : null}
    </ScrollView>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    paddingTop: 15,
    paddingHorizontal: 10,
  },
  desc: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    lineHeight: 20,
  },
  header: {
    minHeight: 36,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
