import { addListMusics, getListMusics, removeUserList, setFetchingListStatus, updateListMusics } from '@/core/list'
import { confirmDialog, handleReadFile, handleSaveFile, showImportTip, toast } from '@/utils/tools'
import syncSourceList from '@/core/syncSourceList'
import { log } from '@/utils/log'
import { filterFileName, filterMusicList, formatPlayTime2, toNewMusicInfo } from '@/utils'
import { handleImportListPart } from '@/screens/Home/Views/Setting/settings/Backup/actions'
import { readMetadata, scanAudioFiles, type MusicMetadataFull } from '@/utils/localMediaMetadata'
import settingState from '@/store/setting/state'
import BackgroundTimer from 'react-native-background-timer'
import { existsFile, moveFile, type FileType } from '@/utils/fs'
import { buildFormattedMusicFileName, parseLocalMusicFileName, type LocalMusicFileNameInfo } from '@/utils/musicCache'

export const handleRemove = (listInfo: LX.List.UserListInfo) => {
  void confirmDialog({
    message: global.i18n.t('list_remove_tip', { name: listInfo.name }),
    confirmButtonText: global.i18n.t('list_remove_tip_button'),
  }).then(isRemove => {
    if (!isRemove) return
    void removeUserList([listInfo.id])
  })
}

const readListData = async(path: string) => {
  let configData: any
  try {
    configData = await handleReadFile(path)
  } catch (error: any) {
    log.error(error.stack)
    throw error
  }
  let listData: LX.ConfigFile.MyListInfoPart['data']
  switch (configData.type) {
    case 'playListPart':
      listData = configData.data
      listData.list = filterMusicList(listData.list.map(m => toNewMusicInfo(m)))
      break
    case 'playListPart_v2':
      listData = configData.data
      break
    default:
      showImportTip(configData.type as string)
      return null
  }
  return listData
}

export const handleImport = (path: string, position: number) => {
  toast(global.i18n.t('setting_backup_part_import_list_tip_unzip'))
  void readListData(path).then(async listData => {
    if (listData == null) return
    void handleImportListPart(listData, position)
  }).catch((err) => {
    log.error(err)
    toast(global.i18n.t('setting_backup_part_import_list_tip_error'))
  })
}

const exportList = async(listInfo: LX.List.MyListInfo, path: string) => {
  const data = JSON.parse(JSON.stringify({
    type: 'playListPart_v2',
    data: {
      ...listInfo,
      list: await getListMusics(listInfo.id),
    },
  }))
  try {
    await handleSaveFile(`${path}/lx_list_part_${filterFileName(listInfo.name)}.lxmc`, data)
  } catch (error: any) {
    log.error(error.stack)
  }
}
export const handleExport = (listInfo: LX.List.MyListInfo, path: string) => {
  toast(global.i18n.t('setting_backup_part_export_list_tip_zip'))
  exportList(listInfo, path).then(() => {
    toast(global.i18n.t('setting_backup_part_export_list_tip_success'))
  }).catch((err: any) => {
    log.error(err.message)
    toast(global.i18n.t('setting_backup_part_export_list_tip_failed') + ': ' + (err.message as string))
  })
}

export const handleSync = (listInfo: LX.List.UserListInfo) => {
  void confirmDialog({
    message: global.i18n.t('list_sync_confirm_tip', { name: listInfo.name }),
    confirmButtonText: global.i18n.t('list_remove_tip_button'),
  }).then(isSync => {
    if (!isSync) return
    void syncSourceList(listInfo).then(() => {
      toast(global.i18n.t('list_update_success', { name: listInfo.name }))
    }).catch(() => {
      toast(global.i18n.t('list_update_error', { name: listInfo.name }))
    })
  })
}

const getPathParts = (path: string) => {
  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return {
    dir: index > -1 ? path.substring(0, index) : '',
    name: index > -1 ? path.substring(index + 1) : path,
    separator: path.includes('\\') ? '\\' : '/',
  }
}

const buildPath = (dir: string, name: string, separator: string) => {
  return dir ? `${dir}${separator}${name}` : name
}

const buildUniqueFilePath = async(dir: string, parsed: LocalMusicFileNameInfo, separator: string) => {
  let targetName = parsed.normalizedName
  let targetPath = buildPath(dir, targetName, separator)
  let index = 1
  while (await existsFile(targetPath)) {
    targetName = buildFormattedMusicFileName(`${parsed.name} (${index++})`, parsed.singer, parsed.source, parsed.songId, parsed.ext)
    targetPath = buildPath(dir, targetName, separator)
  }
  return { targetName, targetPath }
}

const normalizeLocalMusicFile = async(file: FileType): Promise<FileType> => {
  const parsed = parseLocalMusicFileName(file.name)
  if (!parsed?.isLegacyName) return file

  const { dir, separator } = getPathParts(file.path)
  const { targetName, targetPath } = await buildUniqueFilePath(dir, parsed, separator)
  try {
    await moveFile(file.path, targetPath)
    return {
      ...file,
      name: targetName,
      path: targetPath,
    }
  } catch (error: any) {
    log.warn(`Rename local music failed: ${file.path}\n${error?.message || error}`)
    return file
  }
}

const normalizeLocalMusicFiles = async(files: FileType[]) => {
  const result: FileType[] = []
  for (const file of files) result.push(await normalizeLocalMusicFile(file))
  return result
}

const getFileNameByPath = (path: string) => getPathParts(path).name

const buildLocalMeta = (filePath: string, ext: string, parsed: LocalMusicFileNameInfo | null): LX.Music.MusicInfoLocal['meta'] => {
  return {
    albumName: parsed?.source ?? '',
    filePath,
    songId: filePath,
    picUrl: '',
    ext,
    originSource: parsed?.source,
    originSongId: parsed?.songId,
  }
}

export const buildLocalMusicInfoByFilePath = (file: FileType): LX.Music.MusicInfoLocal => {
  const index = file.name.lastIndexOf('.')
  const fileName = index > -1 ? file.name.substring(0, index) : file.name
  const ext = index > -1 ? file.name.substring(index + 1) : ''
  const parsed = parseLocalMusicFileName(file.name)
  return {
    id: file.path,
    name: parsed?.name ?? fileName,
    singer: parsed?.singer ?? '',
    source: 'local',
    interval: null,
    meta: buildLocalMeta(file.path, parsed?.ext ?? ext, parsed),
  }
}
export const buildLocalMusicInfo = (filePath: string, metadata: MusicMetadataFull): LX.Music.MusicInfoLocal => {
  const parsed = parseLocalMusicFileName(getFileNameByPath(filePath))
  return {
    id: filePath,
    name: parsed?.name ?? metadata.name,
    singer: parsed?.singer ?? metadata.singer,
    source: 'local',
    interval: formatPlayTime2(metadata.interval),
    meta: {
      albumName: parsed?.source ?? metadata.albumName,
      filePath,
      songId: filePath,
      picUrl: '',
      ext: parsed?.ext ?? metadata.ext,
      originSource: parsed?.source,
      originSongId: parsed?.songId,
    },
  }
}
const createLocalMusicInfos = async(filePaths: string[], errorPath: string[]): Promise<LX.Music.MusicInfoLocal[]> => {
  const list: LX.Music.MusicInfoLocal[] = []
  filePaths = [...filePaths]
  while (filePaths.length) {
    const tasks = [
      filePaths.shift(),
      filePaths.shift(),
      filePaths.shift(),
      filePaths.shift(),
      filePaths.shift(),
    ].filter(Boolean) as string[]

    await Promise.all(tasks.map(async path => readMetadata(path).then(info => ([path, info] as const)))).then((res) => {
      for (const [path, info] of res) {
        if (!info) {
          errorPath.push(path)
          continue
        }
        list.push(buildLocalMusicInfo(path, info))
      }
    })
  }
  return list
}

const createThrottleAddMusics = (add: (listId: string, musicInfos: LX.Music.MusicInfoLocal[]) => Promise<void>, remove: (listId: string, errorPath: string[]) => Promise<void>, listId: string) => {
  let timer: number | null = null
  let _musicInfos: LX.Music.MusicInfoLocal[] = []
  let _errorPath: string[] = []
  return (musicInfos: LX.Music.MusicInfoLocal[], errorPath?: string[]) => {
    if (musicInfos.length) _musicInfos = [..._musicInfos, ...musicInfos]
    if (errorPath) _errorPath = [..._errorPath, ...errorPath]
    if (timer) return
    timer = BackgroundTimer.setTimeout(async() => {
      timer = null
      let musicInfos = _musicInfos
      _musicInfos = []
      let errorPath = _errorPath
      _errorPath = []
      if (musicInfos.length) await add(listId, musicInfos)
      if (errorPath.length) await remove(listId, errorPath)
    }, 1000)
  }
}

const handleUpdateMusics = async(filePaths: string[],
  throttleUpdateMusics: (musicInfos: LX.Music.MusicInfoLocal[], errorPath?: string[]) => void, index: number = -1, total: number = 0, errorPath: string[] = []) => {
  // console.log(index + 1, index + 201)
  if (!total) total = filePaths.length
  const paths = filePaths.slice(index + 1, index + 11)
  const musicInfos = await createLocalMusicInfos(paths, errorPath)
  if (musicInfos.length) throttleUpdateMusics(musicInfos)
  index += 10
  if (filePaths.length - 1 > index) await handleUpdateMusics(filePaths, throttleUpdateMusics, index, total, errorPath)
  else {
    if (errorPath.length) {
      log.warn('Parse metadata failed:\n' + errorPath.map(p => p.split('/').at(-1)).join('\n'))
      toast(global.i18n.t('list_select_local_file_result_tip', { total }), 'long')
    } else {
      toast(global.i18n.t('list_select_local_file_result_tip', { total }), 'long')
    }
    throttleUpdateMusics([])
  }
}
export const handleImportMediaFile = async(listInfo: LX.List.MyListInfo, path: string) => {
  setFetchingListStatus(listInfo.id, true)
  const files = await normalizeLocalMusicFiles(await scanAudioFiles(path))
  if (files.length) {
    const throttleUpdateMusics = createThrottleAddMusics(async(listId, musicInfos) => {
      return updateListMusics(musicInfos.map(info => ({ id: listId, musicInfo: info })))
    }, async() => {
      // Keep filename-based local entries when metadata parsing fails.
    }, listInfo.id)
    await addListMusics(listInfo.id, files.map(buildLocalMusicInfoByFilePath), settingState.setting['list.addMusicLocationType'])
    toast(global.i18n.t('list_select_local_file_temp_add_tip', { total: files.length }), 'long')
    await handleUpdateMusics(files.map(f => f.path), throttleUpdateMusics)
  } else toast(global.i18n.t('list_select_local_file_empty_tip'), 'long')
  setFetchingListStatus(listInfo.id, false)
}
