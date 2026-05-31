import { type InitParams, onScriptAction, sendAction, type ResponseParams, type UpdateInfoParams, type RequestParams } from '@/utils/nativeModules/userApi'
import { log, setUserApiList, setUserApiStatus } from '@/core/userApi'
import settingState from '@/store/setting/state'
import BackgroundTimer from 'react-native-background-timer'
import { fetchData } from './request'
import { getUserApiList } from '@/utils/data'
import { confirmDialog, openUrl, tipDialog } from '@/utils/tools'
import musicSdk from '@/utils/musicSdk'
import searchMusicState from '@/store/search/music/state'
import searchSonglistState from '@/store/search/songlist/state'
import searchState from '@/store/search/state'
import commonActions from '@/store/common/action'


export default async(setting: LX.AppSetting) => {
  const userApiRequestMap = new Map<string, { resolve: (value: ResponseParams['result']) => void, reject: (error: Error) => void, timeout: number }>()
  const scriptRequestMap = new Map<string, { request: Promise<any>, abort: () => void }>()

  const cancelRequest = (requestKey: string, message: string) => {
    const target = scriptRequestMap.get(requestKey)
    if (!target) return
    scriptRequestMap.delete(requestKey)
    target.abort()
  }
  const sendScriptRequest = (requestKey: string, url: string, options: RequestParams['options']) => {
    let req = fetchData(url, options)
    req.request.then(response => {
      // console.log(response)
      sendAction('response', {
        error: null,
        requestKey,
        response,
      })
    }).catch(err => {
      sendAction('response', {
        error: err.message,
        requestKey,
        response: null,
      })
    }).finally(() => {
      scriptRequestMap.delete(requestKey)
    })
    scriptRequestMap.set(requestKey, req)
  }
  const sendUserApiRequest = async(data: LX.UserApi.UserApiRequestParams) => {
    const handleApiUpdate = () => {
      const target = userApiRequestMap.get(data.requestKey)
      if (!target) return
      userApiRequestMap.delete(data.requestKey)
      BackgroundTimer.clearTimeout(target.timeout)
      target.reject(new Error('request failed'))
    }
    const requestPromise = new Promise<ResponseParams['result']>((resolve, reject) => {
      userApiRequestMap.set(data.requestKey, {
        resolve,
        reject,
        timeout: BackgroundTimer.setTimeout(() => {
          const target = userApiRequestMap.get(data.requestKey)
          if (!target) return
          userApiRequestMap.delete(data.requestKey)
          target.reject(new Error('request timeout'))
        }, 20_000),
      })
      sendAction('request', data)
    }).finally(() => {
      global.state_event.off('apiSourceUpdated', handleApiUpdate)
    })
    global.state_event.on('apiSourceUpdated', handleApiUpdate)
    return requestPromise
  }
  const handleUserApiResponse = ({ status, result, requestKey, errorMessage }: ResponseParams) => {
    const target = userApiRequestMap.get(requestKey)
    if (!target) return
    userApiRequestMap.delete(requestKey)
    BackgroundTimer.clearTimeout(target.timeout)
    if (status) target.resolve(result)
    else target.reject(new Error(errorMessage ?? 'failed'))
  }
  const resetSingleMusicFreeSource = (source: string, sourceInfo: LX.UserApi.UserApiSourceInfo) => {
    const sourceId = source as LX.OnlineSource
    const sourceName = sourceInfo.name || source
    const request = (action: LX.UserApi.UserApiSourceInfoActions, info: any) => {
      const requestKey = `request__${Math.random().toString().substring(2)}`
      return sendUserApiRequest({
        requestKey,
        data: {
          source,
          action,
          info,
        },
      })
    }

    const sdkSource: any = {
      name: sourceName,
      id: source,
      getMusicUrl(songInfo: LX.Music.MusicInfo, type: LX.Quality) {
        const promise = request('musicUrl', {
          type,
          musicInfo: songInfo,
        }).then(res => ({ type, url: res.data.url }))
        return {
          canceleFn() {},
          promise,
        }
      },
    }
    if (sourceInfo.actions.includes('lyric')) {
      sdkSource.getLyric = (songInfo: LX.Music.MusicInfo) => ({
        canceleFn() {},
        promise: request('lyric', {
          musicInfo: songInfo,
        }).then(res => res.data),
      })
    }
    if (sourceInfo.actions.includes('pic')) {
      sdkSource.getPic = (songInfo: LX.Music.MusicInfo) => ({
        canceleFn() {},
        promise: request('pic', {
          musicInfo: songInfo,
        }).then(res => res.data),
      })
    }
    if (sourceInfo.actions.includes('search')) {
      sdkSource.musicSearch = {
        search(text: string, page: number, limit = 30) {
          return request('search', {
            query: text,
            page,
            limit,
            searchType: 'music',
          }).then(res => res.data)
        },
      }
      sdkSource.songList = {
        search(text: string, page: number, limit = 18) {
          return request('search', {
            query: text,
            page,
            limit,
            searchType: 'sheet',
          }).then(res => res.data)
        },
      }
    }

    ;(musicSdk as any).sources = [{ name: sourceName, id: source }]
    ;(musicSdk as any)[source] = sdkSource
    commonActions.setSourceNames({
      [source]: sourceName,
      all: sourceName,
    } as any)

    searchMusicState.source = sourceId
    searchMusicState.sources = [sourceId]
    searchMusicState.listInfos = {
      all: {
        page: 1,
        maxPage: 0,
        limit: 30,
        total: 0,
        list: [],
        key: null,
      },
      [source]: {
        page: 1,
        maxPage: 0,
        limit: 30,
        total: 0,
        list: [],
        key: '',
      },
    } as any
    searchMusicState.maxPages = { [source]: 0 } as any
    searchState.temp_source = source

    searchSonglistState.source = sourceId
    searchSonglistState.sources = [sourceId]
    searchSonglistState.listInfos = {
      all: {
        page: 1,
        limit: 15,
        total: 0,
        list: [],
        key: null,
        tagId: '',
        sortId: '',
      },
      [source]: {
        page: 1,
        limit: 18,
        total: 0,
        list: [],
        key: null,
        tagId: '',
        sortId: '',
      },
    } as any
    searchSonglistState.maxPages = { [source]: 0 } as any
  }
  const handleStateChange = ({ status, errorMessage, info }: InitParams) => {
    // console.log(status, message, info)
    setUserApiStatus(status, errorMessage)
    if (!info || info.id !== settingState.setting['common.apiSource']) return
    if (status) {
      if (info.sources) {
        let apis: any = {}
        let qualitys: LX.QualityList = {}
        const pluginSources: Array<[string, LX.UserApi.UserApiSourceInfo]> = []
        for (const [source, { name, actions, type, qualitys: sourceQualitys }] of Object.entries(info.sources)) {
          if (type != 'music') continue
          pluginSources.push([source, { name, actions, type, qualitys: sourceQualitys }])
          apis[source as LX.Source] = {}
          for (const action of actions) {
            switch (action) {
              case 'musicUrl':
                apis[source].getMusicUrl = (songInfo: LX.Music.MusicInfo, type: LX.Quality) => {
                  const requestKey = `request__${Math.random().toString().substring(2)}`
                  return {
                    canceleFn() {
                      // userApiRequestCancel(requestKey)
                    },
                    promise: sendUserApiRequest({
                      requestKey,
                      data: {
                        source,
                        action: 'musicUrl',
                        info: {
                          type,
                          musicInfo: songInfo,
                        },
                      },
                      // eslint-disable-next-line @typescript-eslint/promise-function-async
                    }).then(res => {
                      // console.log(res)
                      return { type, url: res.data.url }
                    }).catch(err => {
                      console.log(err.message)
                      throw err
                    }),
                  }
                }
                break
              case 'lyric':
                apis[source].getLyric = (songInfo: LX.Music.MusicInfo) => {
                  const requestKey = `request__${Math.random().toString().substring(2)}`
                  return {
                    canceleFn() {
                      // userApiRequestCancel(requestKey)
                    },
                    promise: sendUserApiRequest({
                      requestKey,
                      data: {
                        source,
                        action: 'lyric',
                        info: {
                          type,
                          musicInfo: songInfo,
                        },
                      },
                      // eslint-disable-next-line @typescript-eslint/promise-function-async
                    }).then(res => {
                      // console.log(res)
                      return res.data
                    }).catch(async err => {
                      console.log(err.message)
                      return Promise.reject(err)
                    }),
                  }
                }
                break
              case 'pic':
                apis[source].getPic = (songInfo: LX.Music.MusicInfo) => {
                  const requestKey = `request__${Math.random().toString().substring(2)}`
                  return {
                    canceleFn() {
                      // userApiRequestCancel(requestKey)
                    },
                    promise: sendUserApiRequest({
                      requestKey,
                      data: {
                        source,
                        action: 'pic',
                        info: {
                          type,
                          musicInfo: songInfo,
                        },
                      },
                      // eslint-disable-next-line @typescript-eslint/promise-function-async
                    }).then(res => {
                      // console.log(res)
                      return res.data
                    }).catch(async err => {
                      console.log(err.message)
                      return Promise.reject(err)
                    }),
                  }
                }
                break
              default:
                break
            }
          }
          qualitys[source as LX.Source] = sourceQualitys
        }
        global.lx.qualityList = qualitys
        global.lx.apis = apis
        if (pluginSources.length) resetSingleMusicFreeSource(pluginSources[0][0], pluginSources[0][1])
        global.state_event.apiSourceUpdated(settingState.setting['common.apiSource'])
      }
    } else {
      if (errorMessage) {
        void tipDialog({
          message: `${global.i18n.t('user_api__init_failed_alert', { name: info.name })}\n${errorMessage}`,
          // selection: true,
          btnText: global.i18n.t('ok'),
        })
      }
    }
    if (!global.lx.apiInitPromise[1]) global.lx.apiInitPromise[2](status)
  }
  const showUpdateAlert = ({ name, log, updateUrl }: UpdateInfoParams) => {
    if (updateUrl) {
      void confirmDialog({
        message: `${global.i18n.t('user_api_update_alert', { name })}\n${log}`,
        // selection: true,
        // showCancel: true,
        confirmButtonText: global.i18n.t('user_api_update_alert_open_url'),
        cancelButtonText: global.i18n.t('close'),
      }).then(confirm => {
        if (!confirm) return
        setTimeout(() => {
          void openUrl(updateUrl)
        }, 300)
      })
    } else {
      void tipDialog({
        message: `${global.i18n.t('user_api_update_alert', { name })}\n${log}`,
        // selection: true,
        btnText: global.i18n.t('ok'),
      })
    }
  }

  onScriptAction((event) => {
    // console.log('script actuon: ', event)
    switch (event.action) {
      case 'init':
        if ((event as unknown as { errorMessage?: string }).errorMessage) event.data.errorMessage = (event as unknown as { errorMessage: string }).errorMessage
        handleStateChange(event.data)
        break
      case 'response':
        handleUserApiResponse(event.data)
        break
      case 'request':
        sendScriptRequest(event.data.requestKey, event.data.url, event.data.options)
        break
      case 'cancelRequest':
        cancelRequest(event.data, 'request canceled')
        break
      case 'showUpdateAlert':
        showUpdateAlert(event.data)
        break
      case 'log':
        switch ((event as unknown as { type: keyof typeof log }).type) {
          case 'log':
          case 'info':
            log.info((event as unknown as { log: string }).log)
            break
          case 'error':
            log.error((event as unknown as { log: string }).log)
            break
          case 'warn':
            log.warn((event as unknown as { log: string }).log)
            break
          default:
            break
        }
        break
      default:
        break
    }
  })

  setUserApiList(await getUserApiList())
}
