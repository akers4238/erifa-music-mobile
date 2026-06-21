import { getMusicResource } from '@/core/music'
import settingState from '@/store/setting/state'
import { downloadFile, existsFile } from '@/utils/fs'
import { requestStoragePermission, toast } from '@/utils/tools'
import { buildMusicCachePath, buildPicCachePath, ensureMusicCacheDir, ensureMusicPrivateCacheDir, findCachedMusicPath, findCachedPicPath, getExtFromUrl } from '@/utils/musicCache'
import musicSdk from '@/utils/musicSdk'
import { toOldMusicInfo } from '@/utils'

const MAX_CONCURRENT_DOWNLOADS = 5

const buildSavePath = async(musicInfo: LX.Music.MusicInfo, url: string) => {
  if (musicInfo.source == 'local') return musicInfo.meta.filePath
  const cachedPath = await findCachedMusicPath(musicInfo as LX.Music.MusicInfoOnline)
  if (cachedPath) return cachedPath

  const ext = getExtFromUrl(url)
  return buildMusicCachePath(musicInfo as LX.Music.MusicInfoOnline, ext)
}

const buildHeaders = (resource: LX.Player.MusicResource) => {
  const headers = { ...(resource.headers ?? {}) }
  if (resource.userAgent && !headers['User-Agent']) headers['User-Agent'] = resource.userAgent
  return headers
}

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error)

const getPicUrl = async(musicInfo: LX.Music.MusicInfoOnline) => {
  if (musicInfo.meta.picUrl) return musicInfo.meta.picUrl
  const sdk = musicSdk[musicInfo.source as LX.OnlineSource]
  if (!sdk?.getPic) return ''
  return sdk.getPic(toOldMusicInfo(musicInfo))
}

const downloadMusicPic = async(musicInfo: LX.Music.MusicInfoOnline) => {
  try {
    if (await findCachedPicPath(musicInfo)) return
    const picUrl = await getPicUrl(musicInfo)
    if (!picUrl || !/^https?:\/\//i.test(picUrl)) return
    await ensureMusicPrivateCacheDir()
    const savePath = buildPicCachePath(musicInfo, picUrl)
    if (await existsFile(savePath)) return
    const { promise } = downloadFile(picUrl, savePath, { background: true })
    const result = await promise
    if (result.statusCode && result.statusCode >= 400) throw new Error(`HTTP ${result.statusCode}`)
  } catch (error) {
    console.warn('Download music pic failed:', error)
  }
}

const downloadMusic = async(musicInfo: LX.Music.MusicInfo) => {
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
    isRefresh: true,
    quality: settingState.setting['player.playQuality'],
    allowToggleSource: true,
  })
  const savePath = await buildSavePath(musicInfo, resource.url)
  if (await existsFile(savePath)) {
    await downloadMusicPic(musicInfo as LX.Music.MusicInfoOnline)
    toast(global.i18n.t('download_music_success'))
    return
  }
  const { promise } = downloadFile(resource.url, savePath, {
    headers: buildHeaders(resource),
    background: true,
  })
  const result = await promise
  if (result.statusCode && result.statusCode >= 400) throw new Error(`HTTP ${result.statusCode}`)
  await downloadMusicPic(musicInfo as LX.Music.MusicInfoOnline)
  toast(global.i18n.t('download_music_success'))
}

export const downloadMusicToLocal = async(musicInfo: LX.Music.MusicInfo) => {
  if (musicInfo.source != 'local') {
    const granted = await requestStoragePermission()
    if (!granted) {
      toast(global.i18n.t('download_music_permission_denied'))
      return
    }
  }
  await downloadMusic(musicInfo)
}

const runDownloadQueue = async(musicInfos: LX.Music.MusicInfo[], limit: number) => {
  let index = 0
  const errors: Array<{ musicInfo: LX.Music.MusicInfo, error: unknown }> = []

  const runNext = async(): Promise<void> => {
    const musicInfo = musicInfos[index++]
    if (!musicInfo) return
    try {
      await downloadMusic(musicInfo)
    } catch (error) {
      errors.push({ musicInfo, error })
    }
    await runNext()
  }

  await Promise.all(Array.from({ length: Math.min(limit, musicInfos.length) }, runNext))
  if (errors.length) {
    throw new Error(errors.map(({ musicInfo, error }) => `${musicInfo.name}: ${getErrorMessage(error)}`).join('\n'))
  }
}

export const downloadMusicsToLocal = async(musicInfos: LX.Music.MusicInfo[]) => {
  if (!musicInfos.length) return

  if (musicInfos.some(musicInfo => musicInfo.source != 'local')) {
    const granted = await requestStoragePermission()
    if (!granted) {
      toast(global.i18n.t('download_music_permission_denied'))
      return
    }
  }
  await runDownloadQueue(musicInfos, MAX_CONCURRENT_DOWNLOADS)
}
