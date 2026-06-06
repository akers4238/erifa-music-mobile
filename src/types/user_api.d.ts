declare namespace LX {
  namespace UserApi {
    type UserApiSourceInfoType = 'music'
    type UserApiSourceInfoActions =
      | 'musicUrl'
      | 'lyric'
      | 'pic'
      | 'search'
      | 'albumInfo'
      | 'artistWorks'
      | 'musicSheetInfo'
      | 'importMusicSheet'
      | 'importMusicItem'
      | 'recommendSheetTags'
      | 'recommendSheetsByTag'
      | 'topLists'
      | 'topListDetail'
      | 'musicComments'

    interface UserApiSourceInfo {
      name: string
      type: UserApiSourceInfoType
      actions: UserApiSourceInfoActions[]
      qualitys: LX.Quality[]
    }

    type UserApiSources = Record<LX.Source, UserApiSourceInfo>


    interface UserApiInfo {
      id: string
      name: string
      description: string
      // script: string
      allowShowUpdateAlert: boolean
      author: string
      homepage: string
      version: string
      userVariables?: Array<{
        key: string
        name?: string
        hint?: string
      }>
      userVariablesValue?: Record<string, string>
      alternativePluginId?: string | null
      hints?: Record<string, string[]>
      sources?: UserApiSources
    }

    interface UserApiStatus {
      status: boolean
      message?: string
      apiInfo?: UserApiInfo
    }

    interface UserApiUpdateInfo {
      name: string
      description: string
      log: string
      updateUrl?: string
    }

    interface UserApiRequestParams {
      requestKey: string
      data: any
    }
    interface UserApiRequestParams {
      requestKey: string
      data: any
    }
    type UserApiRequestCancelParams = string
    type UserApiSetApiParams = string

    interface UserApiSetAllowUpdateAlertParams {
      id: string
      enable: boolean
    }

    interface UserApiSetUserVariablesParams {
      id: string
      values: Record<string, string>
    }

    interface UserApiSetAlternativePluginParams {
      id: string
      alternativePluginId: string | null
    }

    interface ImportUserApi {
      apiInfo: UserApiInfo
      apiList: UserApiInfo[]
    }

  }
}
