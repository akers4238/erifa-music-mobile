import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'

import LeftBar, { type LeftBarType, type LeftBarProps } from './LeftBar'
import MusicList, { type MusicListType } from '../MusicList'
import { getLeaderboardSetting, saveLeaderboardSetting } from '@/utils/data'
import boardState from '@/store/leaderboard/state'
import { getBoardsList } from '@/core/leaderboard'
// import { BorderWidths } from '@/theme'
// import { useTheme } from '@/store/theme/hook'


export default () => {
  const leftBarRef = useRef<LeftBarType>(null)
  const musicListRef = useRef<MusicListType>(null)
  const isUnmountedRef = useRef(false)
  // const theme = useTheme()

  const handleChangeBound: LeftBarProps['onChangeList'] = (source, id) => {
    musicListRef.current?.loadList(source, id)
    void saveLeaderboardSetting({
      source,
      boardId: id,
    })
  }

  useEffect(() => {
    const getAvailableSource = (source: LX.OnlineSource) => {
      return boardState.sources.includes(source) ? source : boardState.sources[0]
    }
    const loadSetting = async(preferredSource?: LX.OnlineSource) => {
      const { source: settingSource, boardId } = await getLeaderboardSetting()
      const source = getAvailableSource(preferredSource ?? settingSource)
      if (!source) return
      void getBoardsList(source).then(list => {
        if (!list.length) return
        const bound = list.find(l => l.id == boardId) ?? list[0]
        leftBarRef.current?.setBound(source, bound.id)
        musicListRef.current?.loadList(source, bound.id)
        if (source != settingSource || bound.id != boardId) void saveLeaderboardSetting({ source, boardId: bound.id })
      })
    }
    const handleApiSourceUpdated = (source: LX.OnlineSource) => {
      void loadSetting(source)
    }
    isUnmountedRef.current = false
    void loadSetting()
    global.state_event.on('apiSourceUpdated', handleApiSourceUpdated)

    return () => {
      global.state_event.off('apiSourceUpdated', handleApiSourceUpdated)
      isUnmountedRef.current = true
    }
  }, [])


  return (
    <View style={styles.container}>
      <LeftBar
        ref={leftBarRef}
        onChangeList={handleChangeBound}
      />
      <MusicList
        ref={musicListRef}
      />
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    // borderTopWidth: BorderWidths.normal,
  },
  content: {
    flex: 1,
  },
})
