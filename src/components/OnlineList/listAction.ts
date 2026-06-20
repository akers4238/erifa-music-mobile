import { LIST_IDS } from '@/config/constant'
import { addListMusics } from '@/core/list'
import { playList } from '@/core/player/player'
import { addTempPlayList } from '@/core/player/tempPlayList'
import settingState from '@/store/setting/state'
import { getListMusicSync } from '@/utils/listManage'
import { openUrl, shareMusic, toast } from '@/utils/tools'
import musicSdk from '@/utils/musicSdk'
import { toOldMusicInfo } from '@/utils'
import { downloadMusicsToLocal } from '@/core/downloadMusic'

export const handlePlay = (musicInfo: LX.Music.MusicInfoOnline) => {
  void addListMusics(LIST_IDS.DEFAULT, [musicInfo], settingState.setting['list.addMusicLocationType']).then(() => {
    const index = getListMusicSync(LIST_IDS.DEFAULT).findIndex(m => m.id == musicInfo.id)
    if (index < 0) return
    void playList(LIST_IDS.DEFAULT, index)
  })
}
export const handlePlayLater = (musicInfo: LX.Music.MusicInfoOnline, selectedList: LX.Music.MusicInfoOnline[], onCancelSelect: () => void) => {
  if (selectedList.length) {
    addTempPlayList(selectedList.map(s => ({ listId: '', musicInfo: s })))
    onCancelSelect()
  } else {
    addTempPlayList([{ listId: '', musicInfo }])
  }
}


export const handleShare = (musicInfo: LX.Music.MusicInfoOnline) => {
  shareMusic(settingState.setting['common.shareType'], settingState.setting['download.fileName'], musicInfo)
}

export const handleDownload = (musicInfo: LX.Music.MusicInfoOnline, selectedList: LX.Music.MusicInfoOnline[], onCancelSelect: () => void) => {
  const list = selectedList.length ? selectedList : [musicInfo]
  void downloadMusicsToLocal(list).then(() => {
    if (selectedList.length) onCancelSelect()
  }).catch(err => {
    toast(global.i18n.t('download_music_failed', { msg: err?.message || err }))
  })
}

export const handleShowMusicSourceDetail = async(minfo: LX.Music.MusicInfoOnline) => {
  const url = musicSdk[minfo.source as LX.OnlineSource]?.getMusicDetailPageUrl(toOldMusicInfo(minfo))
  if (!url) return
  void openUrl(url)
}
