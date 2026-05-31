import { useState } from 'react'
import { View } from 'react-native'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import musicSdk from '@/utils/musicSdk'
import searchMusicState from '@/store/search/music/state'
import { createStyle, tipDialog } from '@/utils/tools'

export default () => {
  const theme = useTheme()
  const [keyword, setKeyword] = useState('')
  const [searching, setSearching] = useState(false)
  const [resultText, setResultText] = useState('')

  const handleSearch = async() => {
    const text = keyword.trim()
    if (!text) {
      void tipDialog({
        message: 'Please enter a search keyword',
        btnText: global.i18n.t('ok'),
      })
      return
    }

    const source = searchMusicState.sources.find(source => source != 'all')
    const searchApi = source ? (musicSdk as any)[source]?.musicSearch?.search : null
    if (!source || !searchApi) {
      setResultText('No active plugin')
      return
    }

    setSearching(true)
    setResultText('')
    try {
      const result = await searchApi(text, 1, 30)
      const count = Array.isArray(result?.list) ? result.list.length : 0
      setResultText(`Found ${count} result${count == 1 ? '' : 's'}`)
    } catch (err: any) {
      setResultText(`Search failed: ${err.message || 'unknown error'}`)
    } finally {
      setSearching(false)
    }
  }

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text size={14}>Plugin search request</Text>
        <Button
          style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }}
          onPress={handleSearch}
          disabled={searching}
        >
          <Text size={13} color={theme['c-button-font']}>{searching ? 'Searching' : 'Confirm'}</Text>
        </Button>
      </View>
      <Input
        value={keyword}
        onChangeText={setKeyword}
        placeholder="Search keyword"
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
