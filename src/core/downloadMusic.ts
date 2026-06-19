import { getMusicResource } from '@/core/music'
import settingState from '@/store/setting/state'
import { filterFileName } from '@/utils'
import { downloadFile, existsFile, externalStorageDirectoryPath, mkdir } from '@/utils/fs'
import { formatMusicName, requestStoragePermission, toast } from '@/utils/tools'

const DOWNLOAD_DIR = `${externalStorageDirectoryPath}/Download/LX Music`

const getExtFromUrl = (url: string) => {
  const match = /\.(mp3|m4a|flac|wav|ogg|aac)(?:[?#]|$)/i.exec(url)
  return match?.[1]?.toLowerCase() ?? 'mp3'
}

const buildSavePath = async(musicInfo: LX.Music.MusicInfo, url: string) => {
  const ext = getExtFromUrl(url)
  const rawName = formatMusicName(settingState.setting['download.fileName'], musicInfo.name, musicInfo.singer || '')
  const baseName = filterFileName(rawName).trim() || filterFileName(musicInfo.name).trim() || `music_${Date.now()}`
  let path = `${DOWNLOAD_DIR}/${baseName}.${ext}`
  let index = 1
  while (await existsFile(path)) {
    path = `${DOWNLOAD_DIR}/${baseName} (${index++}).${ext}`
  }
  return path
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
  await mkdir(DOWNLOAD_DIR).catch(() => {})
  const resource = await getMusicResource({
    musicInfo,
    quality: settingState.setting['player.playQuality'],
    allowToggleSource: true,
  })
  const savePath = await buildSavePath(musicInfo, resource.url)
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
