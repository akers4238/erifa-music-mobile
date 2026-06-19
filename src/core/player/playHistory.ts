import playerActions from '@/store/player/action'
import playerState from '@/store/player/state'
import { getPlayHistory, savePlayHistory } from '@/utils/data'

const persistPlayHistory = () => {
  void savePlayHistory(playerState.playHistory)
}

export const initPlayHistory = async() => {
  playerActions.initPlayHistory(await getPlayHistory())
}

export const addPlayHistory = (playMusicInfo: LX.Player.PlayMusicInfo) => {
  playerActions.addPlayHistory(playMusicInfo)
  persistPlayHistory()
}

export const removePlayHistory = (index: number) => {
  playerActions.removePlayHistory(index)
  persistPlayHistory()
}

export const clearPlayHistory = () => {
  playerActions.clearPlayHistory()
  persistPlayHistory()
}
