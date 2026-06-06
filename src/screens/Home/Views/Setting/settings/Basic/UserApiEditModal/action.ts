import { importUserApi } from '@/core/userApi'
import { readFile } from '@/utils/fs'
import { log } from '@/utils/log'
import { toast } from '@/utils/tools'
import { httpFetch } from '@/utils/request'

const getPluginUrls = (value: any): string[] => {
  const list = Array.isArray(value)
    ? value
    : Array.isArray(value?.plugins)
      ? value.plugins
      : Array.isArray(value?.data)
        ? value.data
        : []
  return list
    .map((item: any) => typeof item === 'string' ? item : item?.url || item?.srcUrl || item?.scriptUrl || item?.file)
    .filter((url: any): url is string => typeof url === 'string' && /^https?:\/\//.test(url))
}

const tryParsePluginList = (content: string): string[] => {
  try {
    return getPluginUrls(JSON.parse(content))
  } catch {
    return []
  }
}

const importScriptList = async(scripts: string[]) => {
  let success = 0
  let failed = 0
  for (const script of scripts) {
    try {
      await importUserApi(script)
      success++
    } catch (err: any) {
      failed++
      log.error(err.stack ?? String(err))
    }
  }
  toast(`导入完成：成功 ${success} 个${failed ? `，失败 ${failed} 个` : ''}`, failed ? 'long' : 'short')
  return success > 0
}

export const handleImportScript = async(script: string) => {
  const pluginUrls = tryParsePluginList(script)
  if (pluginUrls.length) {
    const scripts: string[] = []
    for (const url of pluginUrls) {
      try {
        const body = await httpFetch(url).promise.then(resp => resp.body) as string
        if (body && body.length <= 9_000_000) scripts.push(body)
      } catch (err: any) {
        log.error(err.stack ?? String(err))
      }
    }
    if (!scripts.length) {
      toast('插件列表解析成功，但插件脚本下载失败', 'long')
      return false
    }
    return importScriptList(scripts)
  }

  return importUserApi(script).then(() => {
    toast('导入成功')
    return true
  }).catch((error: any) => {
    log.error(error.stack)
    toast(`插件导入失败：${error.message}`, 'long')
    return false
  })
}

export const handleImportLocalFile = (path: string) => {
  // toast(global.i18n.t('setting_backup_part_import_list_tip_unzip'))
  void readFile(path).then(async script => {
    if (script == null) throw new Error('Read file failed')
    void handleImportScript(script)
  }).catch((error: any) => {
    toast(`插件导入失败：${error.message}`, 'long')
  })
}
