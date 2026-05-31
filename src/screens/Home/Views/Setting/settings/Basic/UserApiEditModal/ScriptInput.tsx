import { useState } from 'react'
import { View } from 'react-native'

import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle, tipDialog } from '@/utils/tools'
import { handleImportScript } from './action'

export default () => {
  const theme = useTheme()
  const [script, setScript] = useState('')
  const [importing, setImporting] = useState(false)

  const handleImport = async() => {
    const text = script.trim()
    if (!text) {
      void tipDialog({
        message: 'Paste Is Plus/MusicFree plugin JS first',
        btnText: global.i18n.t('ok'),
      })
      return
    }
    setImporting(true)
    const imported = await handleImportScript(text)
    setImporting(false)
    if (imported) setScript('')
  }

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text size={14}>JS plugin parser</Text>
        <Button
          style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }}
          onPress={handleImport}
          disabled={importing}
        >
          <Text size={13} color={theme['c-button-font']}>{importing ? 'Parsing' : 'Parse import'}</Text>
        </Button>
      </View>
      <Input
        value={script}
        onChangeText={setScript}
        multiline
        textAlignVertical="top"
        placeholder="Paste Is Plus/MusicFree plugin JS"
        size={12}
        style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
      />
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
    height: 120,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    borderRadius: 4,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 4,
  },
})
