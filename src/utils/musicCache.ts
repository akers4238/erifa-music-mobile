import { filterFileName } from '@/utils/common'
import { existsFile, externalStorageDirectoryPath, mkdir, privateStorageDirectoryPath } from '@/utils/fs'

export const MUSIC_CACHE_DIR = `${externalStorageDirectoryPath}/music/lxmusic`
export const MUSIC_PRIVATE_CACHE_DIR = `${privateStorageDirectoryPath}/music/lxmusic`
export const MUSIC_PIC_CACHE_DIR = `${MUSIC_PRIVATE_CACHE_DIR}/pic`
export const MUSIC_CACHE_EXTS = ['mp3', 'm4a', 'flac', 'wav', 'ape', 'ogg', 'aac'] as const

export const getExtFromUrl = (url: string) => {
  const match = /\.(mp3|m4a|flac|wav|ape|ogg|aac)(?:[?#]|$)/i.exec(url)
  return match?.[1]?.toLowerCase() ?? 'mp3'
}

export const buildMusicCacheBaseName = (musicInfo: LX.Music.MusicInfoOnline) => {
  const source = musicInfo.source
  const songId = `${musicInfo.meta.songId || musicInfo.id}`
  const name = [
    musicInfo.name,
    musicInfo.singer || 'unknown',
    source,
    songId,
  ].map(part => filterFileName(`${part}`).trim() || 'unknown')

  return name.join('-')
}

export const buildMusicCachePath = (musicInfo: LX.Music.MusicInfoOnline, ext: string) => {
  return `${MUSIC_CACHE_DIR}/${buildMusicCacheBaseName(musicInfo)}.${ext.toLowerCase()}`
}

export const ensureMusicCacheDir = async() => {
  await mkdir(MUSIC_CACHE_DIR).catch(() => {})
}

export const ensureMusicPrivateCacheDir = async() => {
  await mkdir(MUSIC_PRIVATE_CACHE_DIR).catch(() => {})
  await mkdir(MUSIC_PIC_CACHE_DIR).catch(() => {})
}

export const findCachedMusicPath = async(musicInfo: LX.Music.MusicInfoOnline) => {
  const baseName = buildMusicCacheBaseName(musicInfo)
  for (const ext of MUSIC_CACHE_EXTS) {
    const path = `${MUSIC_CACHE_DIR}/${baseName}.${ext}`
    if (await existsFile(path)) return path
  }
  return ''
}

export const buildPicCachePath = (musicInfo: LX.Music.MusicInfoOnline, url: string) => {
  const ext = /\.(jpe?g|png|webp)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase() ?? 'jpg'
  return `${MUSIC_PIC_CACHE_DIR}/${buildMusicCacheBaseName(musicInfo)}.${ext}`
}

export const findCachedPicPath = async(musicInfo: LX.Music.MusicInfoOnline) => {
  const baseName = buildMusicCacheBaseName(musicInfo)
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const path = `${MUSIC_PIC_CACHE_DIR}/${baseName}.${ext}`
    if (await existsFile(path)) return `file://${path}`
  }
  return ''
}
