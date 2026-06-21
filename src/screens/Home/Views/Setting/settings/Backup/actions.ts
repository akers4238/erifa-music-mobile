import { LIST_IDS } from '@/config/constant'
import { createList, getListMusics, overwriteList, overwriteListFull, overwriteListMusics } from '@/core/list'
import { filterMusicList, fixNewMusicInfoQuality, toNewMusicInfo } from '@/utils'
import { formatPlayTime2 } from '@/utils/common'
import { log } from '@/utils/log'
import { confirmDialog, handleReadFile, handleSaveFile, showImportTip, toast } from '@/utils/tools'
import listState from '@/store/list/state'
import type { WebDavBackupConfig } from '@/utils/data'


const getAllLists = async() => {
  const lists = []
  lists.push(await getListMusics(listState.defaultList.id).then(musics => ({ ...listState.defaultList, list: musics })))
  lists.push(await getListMusics(listState.loveList.id).then(musics => ({ ...listState.loveList, list: musics })))

  for await (const list of listState.userList) {
    lists.push(await getListMusics(list.id).then(musics => ({ ...list, list: musics })))
  }

  return lists
}
const buildPlayListBackupData = async() => JSON.parse(JSON.stringify({
  type: 'playList_v2',
  data: await getAllLists(),
}))

/**
 * 构建 MusicFree 兼容的备份数据
 */
const buildMusicFreeBackupData = async() => {
  const lists = await getAllLists()
  return {
    musicSheets: lists.map(list => ({
      id: list.id,
      title: list.name,
      musicList: list.list.map((item: any) => ({
        id: item.id,
        title: item.name,
        artist: item.singer,
        album: item.meta?.albumName || '',
        artwork: item.meta?.picUrl || '',
        platform: item.source,
        duration: item.interval ? (() => {
          const parts = item.interval.split(':')
          return parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : 0
        })() : 0,
      })),
    })),
    plugins: [],
  }
}

/**
 * 将 MusicFree 格式的歌曲项转换为内部格式
 */
const convertMusicFreeItem = (item: any): LX.Music.MusicInfoOnline => {
  return {
    id: `${item.id ?? ''}`,
    name: item.title ?? '',
    singer: item.artist ?? '',
    source: item.platform ?? 'wy',
    interval: item.duration ? formatPlayTime2(item.duration) : null,
    meta: {
      songId: `${item.id ?? ''}`,
      albumName: item.album ?? '',
      picUrl: item.artwork ?? '',
      qualitys: [],
      _qualitys: {},
    },
  } as LX.Music.MusicInfoOnline
}

/**
 * 导入 MusicFree 格式的歌单数据
 */
const importMusicFreeData = async(musicSheets: any[]) => {
  const lists: Array<LX.List.MyDefaultListInfoFull | LX.List.MyLoveListInfoFull | LX.List.UserListInfoFull> = []
  for (const sheet of musicSheets) {
    const musicList = (sheet.musicList || []).map((item: any) => convertMusicFreeItem(item))
    const list: LX.List.UserListInfoFull = {
      id: sheet.id ?? `musicfree__${Date.now()}`,
      name: sheet.title || '未命名歌单',
      list: filterMusicList(musicList),
      source: null,
      sourceListId: null,
      locationUpdateTime: null,
    }
    lists.push(list)
  }
  return importNewListData(lists)
}

const importOldListData = async(lists: any[]) => {
  const allLists = await getAllLists()
  for (const list of lists) {
    try {
      const targetList = allLists.find(l => l.id == list.id)
      if (targetList) {
        targetList.list = filterMusicList((list.list as any[]).map(m => toNewMusicInfo(m)))
      } else {
        const listInfo = {
          name: list.name,
          id: list.id,
          list: filterMusicList((list.list as any[]).map(m => toNewMusicInfo(m))),
          source: list.source,
          sourceListId: list.sourceListId,
          locationUpdateTime: list.locationUpdateTime ?? null,
        }
        allLists.push(listInfo as LX.List.UserListInfoFull)
      }
    } catch (err) {
      console.log(err)
    }
  }
  const defaultList = allLists.shift()!.list
  const loveList = allLists.shift()!.list
  await overwriteListFull({ defaultList, loveList, userList: allLists as LX.List.UserListInfoFull[] })
}
const importNewListData = async(lists: Array<LX.List.MyDefaultListInfoFull | LX.List.MyLoveListInfoFull | LX.List.UserListInfoFull>) => {
  const allLists = await getAllLists()
  for (const list of lists) {
    try {
      const targetList = allLists.find(l => l.id == list.id)
      if (targetList) {
        targetList.list = filterMusicList(list.list).map(m => fixNewMusicInfoQuality(m))
      } else {
        const data = {
          name: list.name,
          id: list.id,
          list: filterMusicList(list.list).map(m => fixNewMusicInfoQuality(m)),
          source: (list as LX.List.UserListInfoFull).source,
          sourceListId: (list as LX.List.UserListInfoFull).sourceListId,
          locationUpdateTime: (list as LX.List.UserListInfoFull).locationUpdateTime ?? null,
        }
        allLists.push(data as LX.List.UserListInfoFull)
      }
    } catch (err) {
      console.log(err)
    }
  }
  const defaultList = allLists.shift()!.list
  const loveList = allLists.shift()!.list
  await overwriteListFull({ defaultList, loveList, userList: allLists as LX.List.UserListInfoFull[] })
}

/**
 * 导入单个列表
 * @param listData
 * @param position
 * @returns
 */
export const handleImportListPart = async(listData: LX.ConfigFile.MyListInfoPart['data'], position: number = listState.userList.length) => {
  const targetList = listState.allList.find(l => l.id === listData.id)
  if (targetList) {
    const confirm = await confirmDialog({
      message: global.i18n.t('list_import_part_confirm', { importName: listData.name, localName: targetList.name }),
      cancelButtonText: global.i18n.t('list_import_part_button_cancel'),
      confirmButtonText: global.i18n.t('list_import_part_button_confirm'),
      bgClose: false,
    })
    if (confirm) {
      listData.name = targetList.name
      void overwriteList(listData).then(() => {
        toast(global.i18n.t('setting_backup_part_import_list_tip_success'))
      }).catch((err) => {
        log.error(err)
        toast(global.i18n.t('setting_backup_part_import_list_tip_error'))
      })
      return
    }
    listData.id += `__${Date.now()}`
  }
  const userList = listData as LX.List.UserListInfoFull
  void createList({
    name: userList.name,
    id: userList.id,
    list: userList.list,
    source: userList.source,
    sourceListId: userList.sourceListId,
    position: Math.max(position, -1),
  }).then(() => {
    toast(global.i18n.t('setting_backup_part_import_list_tip_success'))
  }).catch((err) => {
    log.error(err)
    toast(global.i18n.t('setting_backup_part_import_list_tip_error'))
  })
}

const showConfirm = async() => {
  return confirmDialog({
    message: global.i18n.t('list_import_part_confirm_tip'),
    cancelButtonText: global.i18n.t('dialog_cancel'),
    confirmButtonText: global.i18n.t('confirm_button_text'),
    bgClose: false,
  })
}
const importPlayList = async(path: string) => {
  let configData: any
  try {
    configData = await handleReadFile(path)
  } catch (error: any) {
    log.error(error.stack)
    throw error
  }

  return importPlayListData(configData)
}

const importPlayListData = async(configData: any) => {
  // 检测 MusicFree 格式（含有 musicSheets 字段）
  if (configData.musicSheets && Array.isArray(configData.musicSheets)) {
    if (!await showConfirm()) return true
    await importMusicFreeData(configData.musicSheets)
    return
  }
  switch (configData.type) {
    case 'defautlList': // 兼容0.6.2及以前版本的列表数据
      if (!await showConfirm()) return true
      await overwriteListMusics(LIST_IDS.DEFAULT, filterMusicList((configData.data as LX.List.MyDefaultListInfoFull).list.map(m => toNewMusicInfo(m))))
      break
    case 'playList':
      if (!await showConfirm()) return true
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await importOldListData(configData.data)
      break
    case 'playList_v2':
      if (!await showConfirm()) return true
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await importNewListData(configData.data)
      break
    case 'allData':
      if (!await showConfirm()) return true
      // 兼容0.6.2及以前版本的列表数据
      if (configData.defaultList) await overwriteListMusics(LIST_IDS.DEFAULT, filterMusicList((configData.defaultList as LX.List.MyDefaultListInfoFull).list.map(m => toNewMusicInfo(m))))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      else await importOldListData(configData.playList)
      break
    case 'allData_v2':
      if (!await showConfirm()) return true
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await importNewListData(configData.playList)
      break
    case 'playListPart':
      configData.data.list = filterMusicList((configData.data as LX.ConfigFile.MyListInfoPart['data']).list.map(m => toNewMusicInfo(m)))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      void handleImportListPart(configData.data)
      return true
    case 'playListPart_v2':
      configData.data.list = filterMusicList((configData.data as LX.ConfigFile.MyListInfoPart['data']).list).map(m => fixNewMusicInfoQuality(m))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      void handleImportListPart(configData.data)
      return true
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    default: showImportTip(configData.type)
  }
}

export const handleImportList = (path: string) => {
  console.log(path)
  toast(global.i18n.t('setting_backup_part_import_list_tip_unzip'))
  void importPlayList(path).then((skipTip) => {
    if (skipTip) return
    toast(global.i18n.t('setting_backup_part_import_list_tip_success'))
  }).catch((err) => {
    log.error(err)
    toast(global.i18n.t('setting_backup_part_import_list_tip_error'))
  })
}


const exportAllList = async(path: string) => {
  const data = await buildPlayListBackupData()

  try {
    await handleSaveFile(path + '/lx_list.lxmc', data)
  } catch (error: any) {
    log.error(error.stack)
  }
}
export const handleExportList = (path: string) => {
  toast(global.i18n.t('setting_backup_part_export_list_tip_zip'))
  void exportAllList(path).then(() => {
    toast(global.i18n.t('setting_backup_part_export_list_tip_success'))
  }).catch((err: any) => {
    log.error(err.message)
    toast(global.i18n.t('setting_backup_part_export_list_tip_failed') + ': ' + (err.message as string))
  })
}

const normalizeWebDavPath = (path: string) => path
  .split('/')
  .map(part => part.trim())
  .filter(Boolean)
  .join('/')

const buildAuthHeader = ({ username, password }: Pick<WebDavBackupConfig, 'username' | 'password'>) => {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

const requestWebDav = async(url: string, config: WebDavBackupConfig, init: RequestInit, allowStatus: number[] = []) => {
  const response = await global.fetch(url, {
    ...init,
    headers: {
      Authorization: buildAuthHeader(config),
      ...init.headers,
    },
  })
  if (!response.ok && !allowStatus.includes(response.status)) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  return response
}

const ensureWebDavDir = async(baseUrl: string, config: WebDavBackupConfig, dir: string) => {
  let current = ''
  for (const part of dir.split('/').filter(Boolean)) {
    current += `/${encodeURIComponent(part)}`
    await requestWebDav(`${baseUrl}${current}`, config, { method: 'MKCOL' }, [405])
  }
}

const buildWebDavFileName = () => {
  const time = new Date().toISOString().replace(/[:.]/g, '-')
  return `lx_list_${time}.json`
}

const buildWebDavFileUrl = (baseUrl: string, path: string) => {
  return `${baseUrl}/${normalizeWebDavPath(path).split('/').map(encodeURIComponent).join('/')}`
}

const parseWebDavBackupText = (text: string) => {
  let data = JSON.parse(text)
  if (typeof data != 'object') data = JSON.parse(data as string)
  return data
}

const readXmlText = (xml: string, tag: string) => {
  const match = new RegExp(`<[^>]*:?${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${tag}>`, 'i').exec(xml)
  return match?.[1]?.trim() ?? ''
}

const decodeXmlText = (text: string) => text
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&')

export interface WebDavBackupFile {
  name: string
  path: string
  updatedAt: string
}

const parseWebDavList = (xml: string, dir: string): WebDavBackupFile[] => {
  const result: WebDavBackupFile[] = []
  const normalizedDir = normalizeWebDavPath(dir)
  const responseRxp = /<[^>]*:?response[^>]*>([\s\S]*?)<\/[^>]*:?response>/gi
  let match
  while ((match = responseRxp.exec(xml)) != null) {
    const itemXml = match[1]
    const href = decodeURIComponent(decodeXmlText(readXmlText(itemXml, 'href')))
    const name = href.split('/').filter(Boolean).pop() ?? ''
    if (!name.endsWith('.json')) continue
    result.push({
      name,
      path: `${normalizedDir}/${name}`,
      updatedAt: decodeXmlText(readXmlText(itemXml, 'getlastmodified')),
    })
  }
  return result.sort((a, b) => b.name.localeCompare(a.name))
}

export const handleWebDavBackupList = (config: WebDavBackupConfig) => {
  toast(global.i18n.t('setting_backup_webdav_uploading'))
  void (async() => {
    const baseUrl = config.url.trim().replace(/\/+$/, '')
    if (!baseUrl || !config.username.trim() || !config.password) throw new Error(global.i18n.t('setting_backup_webdav_config_invalid'))

    const dir = normalizeWebDavPath(config.dir || 'lx-music-mobile/playlist-backup')
    await ensureWebDavDir(baseUrl, config, dir)

    const data = await buildMusicFreeBackupData()
    const fileName = buildWebDavFileName()
    const fileUrl = buildWebDavFileUrl(baseUrl, `${dir}/${fileName}`)
    await requestWebDav(fileUrl, config, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    toast(global.i18n.t('setting_backup_webdav_success'))
  })().catch((err: Error) => {
    log.error(err.message)
    toast(`${global.i18n.t('setting_backup_webdav_failed')}: ${err.message}`)
  })
}

export const getWebDavBackupFiles = async(config: WebDavBackupConfig): Promise<WebDavBackupFile[]> => {
  const baseUrl = config.url.trim().replace(/\/+$/, '')
  if (!baseUrl || !config.username.trim() || !config.password) throw new Error(global.i18n.t('setting_backup_webdav_config_invalid'))

  const dir = normalizeWebDavPath(config.dir || 'lx-music-mobile/playlist-backup')
  const response = await requestWebDav(buildWebDavFileUrl(baseUrl, dir), config, {
    method: 'PROPFIND',
    headers: {
      Depth: '1',
    },
  })
  return parseWebDavList(await response.text(), dir)
}

export const handleWebDavRestoreList = (config: WebDavBackupConfig) => {
  toast(global.i18n.t('setting_backup_webdav_downloading'))
  void (async() => {
    const baseUrl = config.url.trim().replace(/\/+$/, '')
    const restorePath = normalizeWebDavPath(config.restorePath)
    if (!baseUrl || !config.username.trim() || !config.password || !restorePath) throw new Error(global.i18n.t('setting_backup_webdav_config_invalid'))

    const response = await requestWebDav(buildWebDavFileUrl(baseUrl, restorePath), config, { method: 'GET' })
    const text = await response.text()
    const skipTip = await importPlayListData(parseWebDavBackupText(text))
    if (skipTip) return
    toast(global.i18n.t('setting_backup_webdav_restore_success'))
  })().catch((err: Error) => {
    log.error(err.message)
    toast(`${global.i18n.t('setting_backup_webdav_restore_failed')}: ${err.message}`)
  })
}
