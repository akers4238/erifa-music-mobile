import { useState } from 'react'
import { View } from 'react-native'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import musicSdk from '@/utils/musicSdk'
import searchMusicState from '@/store/search/music/state'
import { createStyle, tipDialog } from '@/utils/tools'
import settingState from '@/store/setting/state'
import { state as userApiState } from '@/store/userApi'
import { setUserApi } from '@/core/userApi'

const getPluginSearchApi = () => {
  const source = searchMusicState.sources.find(source => source != 'all')
  const searchApi = source ? (musicSdk as any)[source]?.musicSearch?.search : null
  return searchApi ? { source, searchApi } : null
}

const ensurePluginSearchApi = async() => {
  const current = getPluginSearchApi()
  if (current) return current

  const settingApiId = settingState.setting['common.apiSource']
  const target = /^user_api/.test(settingApiId)
    ? userApiState.list.find(api => api.id == settingApiId)
    : userApiState.list.find(api => api.sources && Object.values(api.sources).some(source => source.actions.includes('search')))
  if (!target) return null

  await setUserApi(target.id)
  return getPluginSearchApi()
}

export default () => {
  const theme = useTheme()
  const [keyword, setKeyword] = useState('')
  const [searching, setSearching] = useState(false)
  const [resultText, setResultText] = useState('')

  const handleSearch = async() => {
    const text = keyword.trim()
    if (!text) {
      void tipDialog({
        message: '请输入搜索关键词',
        btnText: '知道了',
      })
      return
    }

    setSearching(true)
    setResultText('')
    const pluginSearchApi = await ensurePluginSearchApi().catch((err: any) => {
      setResultText(`插件启用失败：${err.message || 'unknown error'}`)
      return null
    })
    if (!pluginSearchApi) {
      setSearching(false)
      setResultText('没有可用于搜索的 MusicFree 插件，请先导入并启用一个支持搜索的插件')
      return
    }

    try {
      const result = await pluginSearchApi.searchApi(text, 1, 30)
      const count = Array.isArray(result?.list) ? result.list.length : 0
      setResultText(`当前音源 ${pluginSearchApi.source} 找到 ${count} 条结果`)
    } catch (err: any) {
      setResultText(`搜索失败：${err.message || 'unknown error'}`)
    } finally {
      setSearching(false)
    }
  }

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text size={14}>插件搜索测试</Text>
        <Button
          style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }}
          onPress={handleSearch}
          disabled={searching}
        >
          <Text size={13} color={theme['c-button-font']}>{searching ? '搜索中' : '确认'}</Text>
        </Button>
      </View>
      <Input
        value={keyword}
        onChangeText={setKeyword}
        placeholder="输入搜索关键词"
        size={12}
        style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
        returnKeyType="search"
        onSubmitEditing={handleSearch}
      />
      {
        resultText
          ? <Text style={styles.result} size={12} color={theme['c-font-label']}>{resultText}</Text>
          : null
      }
    </View>
  )
}

const styles = createStyle({
  content: {
    marginTop: 10,
    paddingHorizontal: 7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  input: {
    paddingRight: 8,
    borderRadius: 4,
  },
  result: {
    marginTop: 8,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 4,
  },
})
