import { getMusicResource } from '@/core/music'
import settingState from '@/store/setting/state'
import { downloadFile, existsFile } from '@/utils/fs'
import { requestStoragePermission, toast } from '@/utils/tools'
import { buildMusicCachePath, ensureMusicCacheDir, findCachedMusicPath, getExtFromUrl } from '@/utils/musicCache'

const buildSavePath = async(musicInfo: LX.Music.MusicInfo, url: string) => {
  if (musicInfo.source == 'local') return musicInfo.meta.filePath
  const cachedPath = await findCachedMusicPath(musicInfo)
  if (cachedPath) return cachedPath

  const ext = getExtFromUrl(url)
  return buildMusicCachePath(musicInfo, ext)
}

const buildHeaders = (resource: LX.Player.MusicResource) => {
  const headers = { ...(resource.headers ?? {}) }
  if (resource.userAgent && !headers['User-Agent']) headers['User-Agent'] = resource.userAgent
  return headers
}

export const downloadMusicToLocal = async(musicInfo: LX.Music.MusicInfo) => {
  if (musicInfo.source == 'local') {
    toast(global.i18n.t('download_music_skip_local'))
    return
  }

  const granted = await requestStoragePermission()
  if (!granted) {
    toast(global.i18n.t('download_music_permission_denied'))
    return
  }

  toast(global.i18n.t('download_music_start', { name: musicInfo.name }))
  await ensureMusicCacheDir()
  const resource = await getMusicResource({
    musicInfo,
    quality: settingState.setting['player.playQuality'],
    allowToggleSource: true,
  })
  const savePath = await buildSavePath(musicInfo, resource.url)
  if (await existsFile(savePath)) {
    toast(global.i18n.t('download_music_success'))
    return
  }
  const { promise } = downloadFile(resource.url, savePath, {
    headers: buildHeaders(resource),
    background: true,
  })
  const result = await promise
  if (result.statusCode && result.statusCode >= 400) throw new Error(`HTTP ${result.statusCode}`)
  toast(global.i18n.t('download_music_success'))
}

export const downloadMusicsToLocal = async(musicInfos: LX.Music.MusicInfo[]) => {
  for (const musicInfo of musicInfos) {
    await downloadMusicToLocal(musicInfo)
  }
}
