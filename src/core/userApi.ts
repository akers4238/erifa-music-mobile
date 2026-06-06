import { action, state } from '@/store/userApi'
import settingState from '@/store/setting/state'
import { addUserApiWithInfo, getUserApiList, getUserApiScript, removeUserApi as removeUserApiFromStore, setUserApiAllowShowUpdateAlert as setUserApiAllowShowUpdateAlertFromStore, setUserApiAlternativePlugin as setUserApiAlternativePluginFromStore, setUserApiUserVariables as setUserApiUserVariablesFromStore } from '@/utils/data'
import { log as writeLog } from '@/utils/log'
import { activateMusicFreePlugin, destroyMusicFreePlugin, getMusicFreePluginInfo, importMusicFreeItem, importMusicFreeSheet } from './musicFreePlugin'


export const setUserApi = async(apiId: string) => {
  global.lx.qualityList = {}
  setUserApiStatus(false, 'initing')

  const target = state.list.find(api => api.id === apiId)
  if (!target) throw new Error('api not found')
  const script = await getUserApiScript(target.id)
  await activateMusicFreePlugin(target, script)
  setUserApiStatus(true, undefined)
  if (!global.lx.apiInitPromise[1]) global.lx.apiInitPromise[2](true)
}

export const destroyUserApi = () => {
  destroyMusicFreePlugin()
}


export const setUserApiStatus: typeof action['setStatus'] = (status, message) => {
  action.setStatus(status, message)
}

export const setUserApiList: typeof action['setUserApiList'] = (list) => {
  action.setUserApiList(list)
}

export const importUserApi = async(script: string) => {
  const pluginInfo = getMusicFreePluginInfo(script)
  await addUserApiWithInfo(script, pluginInfo)
  action.setUserApiList(await getUserApiList())
}

export const removeUserApi = async(ids: string[]) => {
  const list = await removeUserApiFromStore(ids)
  action.setUserApiList(list)
}

export const setUserApiAllowShowUpdateAlert = async(id: string, enable: boolean) => {
  await setUserApiAllowShowUpdateAlertFromStore(id, enable)
  action.setUserApiAllowShowUpdateAlert(id, enable)
}

export const setUserApiUserVariables = async(id: string, values: Record<string, string>) => {
  await setUserApiUserVariablesFromStore(id, values)
  action.setUserApiUserVariables(id, values)
  if (settingState.setting['common.apiSource'] == id) await setUserApi(id)
}

export const setUserApiAlternativePlugin = async(id: string, alternativePluginId: string | null) => {
  await setUserApiAlternativePluginFromStore(id, alternativePluginId)
  action.setUserApiAlternativePlugin(id, alternativePluginId)
  if (settingState.setting['common.apiSource'] == id) await setUserApi(id)
}

const getUserApiInfoAndScript = async(id: string) => {
  const target = (await getUserApiList()).find(api => api.id == id)
  if (!target) throw new Error('Plugin not found')
  const script = await getUserApiScript(target.id)
  return { target, script }
}

export const importMusicFreePluginItem = async(id: string, urlLike: string) => {
  const { target, script } = await getUserApiInfoAndScript(id)
  return importMusicFreeItem(target, script, urlLike)
}

export const importMusicFreePluginSheet = async(id: string, urlLike: string) => {
  const { target, script } = await getUserApiInfoAndScript(id)
  return importMusicFreeSheet(target, script, urlLike)
}

export const log = {
  r_info(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.info(...params)
  },
  r_warn(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.warn(...params)
  },
  r_error(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.error(...params)
  },
  log(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  info(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  warn(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.warn(...params)
  },
  error(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.error(...params)
  },
}
