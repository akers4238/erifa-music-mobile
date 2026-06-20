import { filterFileName } from '@/utils/common'
import { existsFile, externalStorageDirectoryPath, mkdir, privateStorageDirectoryPath } from '@/utils/fs'

export const MUSIC_CACHE_DIR = `${externalStorageDirectoryPath}/music/lxmusic`
export const MUSIC_PRIVATE_CACHE_DIR = `${privateStorageDirectoryPath}/music/lxmusic`
export const MUSIC_PIC_CACHE_DIR = `${MUSIC_PRIVATE_CACHE_DIR}/pic`
export const MUSIC_CACHE_EXTS = ['mp3', 'm4a', 'flac', 'wav', 'ape', 'ogg', 'aac'] as const
const UNKNOWN_NAME = 'unknown'

export interface LocalMusicFileNameInfo {
  name: string
  singer: string
  source: LX.OnlineSource
  songId: string
  ext: string
  normalizedName: string
  isLegacyName: boolean
}

export const getExtFromUrl = (url: string) => {
  const match = /\.(mp3|m4a|flac|wav|ape|ogg|aac)(?:[?#]|$)/i.exec(url)
  return match?.[1]?.toLowerCase() ?? 'mp3'
}

const normalizeFileNamePart = (value: string | number | null | undefined) => {
  const part = filterFileName(`${value ?? ''}`).trim()
  return part || UNKNOWN_NAME
}

export const buildFormattedMusicFileName = (name: string, singer: string, source: string, songId: string | number, ext: string) => {
  return buildFormattedMusicBaseName(name, singer, source, songId) + `.${normalizeFileNamePart(ext).toLowerCase()}`
}

export const buildFormattedMusicBaseName = (name: string, singer: string, source: string, songId: string | number) => {
  return [
    normalizeFileNamePart(name),
    normalizeFileNamePart(singer),
    normalizeFileNamePart(source),
    normalizeFileNamePart(songId),
  ].join('-')
}

const splitNameAndExt = (fileName: string) => {
  const index = fileName.lastIndexOf('.')
  return {
    baseName: index > -1 ? fileName.substring(0, index) : fileName,
    ext: index > -1 ? fileName.substring(index + 1) : '',
  }
}

const isOnlineSource = (source: string): source is LX.OnlineSource => {
  return ['kw', 'kg', 'tx', 'wy', 'mg', 'bilibili'].includes(source)
}

export const parseLocalMusicFileName = (fileName: string): LocalMusicFileNameInfo | null => {
  const { baseName, ext } = splitNameAndExt(fileName)
  if (!baseName || !ext) return null

  const legacyParts = baseName.split('@')
  if (legacyParts.length >= 4 && isOnlineSource(legacyParts[0]) && legacyParts[1] && legacyParts[2]) {
    const source = legacyParts[0]
    const songId = legacyParts[1]
    const name = legacyParts.slice(2, -1).join('@') || UNKNOWN_NAME
    const singer = legacyParts.at(-1) || UNKNOWN_NAME
    return {
      name,
      singer,
      source,
      songId,
      ext,
      normalizedName: buildFormattedMusicFileName(name, singer, source, songId, ext),
      isLegacyName: true,
    }
  }

  const normalizedParts = baseName.split('-')
  if (normalizedParts.length >= 4) {
    const songId = normalizedParts.at(-1)!
    const source = normalizedParts.at(-2)!
    if (isOnlineSource(source) && songId) {
      const titleAndSinger = normalizedParts.slice(0, -2)
      const singer = titleAndSinger.pop() || UNKNOWN_NAME
      const name = titleAndSinger.join('-') || UNKNOWN_NAME
      return {
        name,
        singer,
        source,
        songId,
        ext,
        normalizedName: buildFormattedMusicFileName(name, singer, source, songId, ext),
        isLegacyName: false,
      }
    }
  }

  return null
}

export const buildMusicCacheBaseName = (musicInfo: LX.Music.MusicInfoOnline) => {
  const source = musicInfo.source
  const songId = `${musicInfo.meta.songId || musicInfo.id}`
  return buildFormattedMusicBaseName(musicInfo.name, musicInfo.singer || UNKNOWN_NAME, source, songId)
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
