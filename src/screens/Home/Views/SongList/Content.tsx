import { getSongListSetting, saveSongListSetting } from '@/utils/data'
import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'

// import List from './List/List'
import HeaderBar, { type HeaderBarProps, type HeaderBarType } from './HeaderBar'
import songlistState, { type InitState, type SortInfo } from '@/store/songlist/state'
import List, { type ListType } from './List'


interface SonglistInfo {
  source: InitState['sources'][number]
  sortId: SortInfo['id']
  tagId: string
}

const fallbackSortList: SortInfo[] = [{ name: 'Default', tid: 'recommend', id: 'default' }]

const getAvailableSource = (source: InitState['sources'][number]) => {
  return songlistState.sources.includes(source) ? source : songlistState.sources[0]
}

const getSourceSortList = (source: InitState['sources'][number]) => {
  return songlistState.sortList[source]?.length ? songlistState.sortList[source]! : fallbackSortList
}

export default () => {
  const headerBarRef = useRef<HeaderBarType>(null)
  const listRef = useRef<ListType>(null)
  const songlistInfo = useRef<SonglistInfo>({ source: 'kw', sortId: '5', tagId: '' })

  useEffect(() => {
    void getSongListSetting().then(info => {
      const source = getAvailableSource(info.source)
      if (!source) return
      const sortList = getSourceSortList(source)
      const sortId = sortList.some(sort => sort.id == info.sortId) ? info.sortId : sortList[0].id
      const tagId = sortId == info.sortId ? info.tagId : ''
      const tagName = tagId ? info.tagName : ''

      songlistInfo.current.source = source
      songlistInfo.current.sortId = sortId
      songlistInfo.current.tagId = tagId
      if (source != info.source || sortId != info.sortId || tagId != info.tagId) {
        void saveSongListSetting({ source, sortId, tagId, tagName })
      }
      headerBarRef.current?.setSource(source, sortId, tagName, tagId)
      listRef.current?.loadList(source, sortId, tagId)
    })
  }, [])

  const handleSortChange: HeaderBarProps['onSortChange'] = (id) => {
    songlistInfo.current.sortId = id
    void saveSongListSetting({ sortId: id })
    listRef.current?.loadList(songlistInfo.current.source, id, songlistInfo.current.tagId)
  }

  const handleTagChange: HeaderBarProps['onTagChange'] = (name, id) => {
    songlistInfo.current.tagId = id
    void saveSongListSetting({ tagName: name, tagId: id })
    listRef.current?.loadList(songlistInfo.current.source, songlistInfo.current.sortId, id)
  }

  const handleSourceChange: HeaderBarProps['onSourceChange'] = (source) => {
    songlistInfo.current.source = source
    songlistInfo.current.tagId = ''
    songlistInfo.current.sortId = getSourceSortList(source)[0].id
    void saveSongListSetting({ sortId: songlistInfo.current.sortId, source, tagId: '', tagName: '' })
    headerBarRef.current?.setSource(source, songlistInfo.current.sortId, '', songlistInfo.current.tagId)
    listRef.current?.loadList(source, songlistInfo.current.sortId, songlistInfo.current.tagId)
  }

  return (
    <View style={styles.container}>
      <HeaderBar
        ref={headerBarRef}
        onSortChange={handleSortChange}
        onTagChange={handleTagChange}
        onSourceChange={handleSourceChange}
      />
      <List ref={listRef} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
  },
})
