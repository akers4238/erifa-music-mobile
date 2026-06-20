import playerActions from '@/store/player/action'
import playerState from '@/store/player/state'
import { getPlayHistory, savePlayHistory } from '@/utils/data'
import { LIST_IDS } from '@/config/constant'
import { setMusicList } from '@/utils/listManage'

const persistPlayHistory = () => {
  void savePlayHistory(playerState.playHistory)
}

const toMusicInfo = (musicInfo: LX.Player.PlayMusicInfo['musicInfo']): LX.Music.MusicInfo => {
  return 'metadata' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
}

const syncPlayHistoryList = () => {
  setMusicList(LIST_IDS.PLAY_HISTORY, playerState.playHistory.map(info => toMusicInfo(info.musicInfo)))
}

export const initPlayHistory = async() => {
  playerActions.initPlayHistory(await getPlayHistory())
  syncPlayHistoryList()
}

export const addPlayHistory = (playMusicInfo: LX.Player.PlayMusicInfo) => {
  playerActions.addPlayHistory(playMusicInfo)
  syncPlayHistoryList()
  persistPlayHistory()
}

export const removePlayHistory = (index: number) => {
  playerActions.removePlayHistory(index)
  syncPlayHistoryList()
  persistPlayHistory()
}

export const clearPlayHistory = () => {
  playerActions.clearPlayHistory()
  syncPlayHistoryList()
  persistPlayHistory()
}

export const playHistoryList = (index: number) => {
  syncPlayHistoryList()
  void import('./player').then(({ playList }) => {
    void playList(LIST_IDS.PLAY_HISTORY, index)
  })
}
