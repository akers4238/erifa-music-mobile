import { filterFileName } from '@/utils/common'
import { existsFile, externalStorageDirectoryPath, mkdir, privateStorageDirectoryPath } from '@/utils/fs'

export const MUSIC_CACHE_DIR = `${externalStorageDirectoryPath}/music/lxmusic`
export const MUSIC_PRIVATE_CACHE_DIR = `${privateStorageDirectoryPath}/music/lxmusic`
export const MUSIC_PIC_CACHE_DIR = `${MUSIC_PRIVATE_CACHE_DIR}/pic`
export const MUSIC_CACHE_EXTS = ['mp3', 'm4a', 'flac', 'wav', 'ape', 'ogg', 'aac'] as const
const UNKNOWN_NAME = 'unknown'
const SOURCE_ALIASES = new Map<string, LX.OnlineSource>([
  ['wy', 'wy'],
  ['netease', 'wy'],
  ['网易云', 'wy'],
  ['网易音乐', 'wy'],
  ['网易云音乐', 'wy'],
  ['bilibili', 'bilibili'],
  ['bili', 'bilibili'],
  ['b站', 'bilibili'],
  ['B站', 'bilibili'],
  ['哔哩哔哩', 'bilibili'],
  ['嗶哩嗶哩', 'bilibili'],
])

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

const normalizeSource = (source: string): LX.OnlineSource | null => {
  return SOURCE_ALIASES.get(source.trim()) ?? SOURCE_ALIASES.get(source.trim().toLowerCase()) ?? null
}

const isSingerContinuationPart = (part: string) => {
  const value = part.trim()
  if (!value) return false
  if (/^[A-Za-z]$/.test(value)) return true
  if (/^[A-Z0-9]{2,8}$/.test(value)) return true
  return false
}

const splitFormattedTitleAndSinger = (parts: string[]) => {
  if (parts.length <= 1) {
    return {
      name: parts[0] ?? UNKNOWN_NAME,
      singer: UNKNOWN_NAME,
    }
  }

  let singerStartIndex = parts.length - 1
  while (singerStartIndex > 1 && isSingerContinuationPart(parts[singerStartIndex - 1])) {
    singerStartIndex--
  }
  return {
    name: parts.slice(0, singerStartIndex).join('-') || UNKNOWN_NAME,
    singer: parts.slice(singerStartIndex).join('-') || UNKNOWN_NAME,
  }
}

export const parseLocalMusicFileName = (fileName: string): LocalMusicFileNameInfo | null => {
  const { baseName, ext } = splitNameAndExt(fileName)
  if (!baseName || !ext) return null

  const legacyParts = baseName.split('@')
  const legacySource = normalizeSource(legacyParts[0] ?? '')
  if (legacyParts.length >= 4 && legacySource && legacyParts[1] && legacyParts[2]) {
    const source = legacySource
    const songId = legacyParts[1]
    const name = legacyParts.slice(2, -1).join('@') || UNKNOWN_NAME
    const singer = legacyParts.at(-1) ?? UNKNOWN_NAME
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
    const source = normalizeSource(normalizedParts.at(-2)!)
    if (source && songId) {
      const titleAndSinger = normalizedParts.slice(0, -2)
      const { name, singer } = splitFormattedTitleAndSinger(titleAndSinger)
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
