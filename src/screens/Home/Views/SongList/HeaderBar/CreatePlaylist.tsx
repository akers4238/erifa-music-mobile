import { memo, useRef, useState } from 'react'
import { View } from 'react-native'

import Button from '@/components/common/Button'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle, toast } from '@/utils/tools'
import songListApi from '@/utils/musicSdk/wy/songList'
import { type Source } from '@/store/songlist/state'

interface CreatePlaylistProps {
  source: Source
  onCreated: () => void
}

export default memo(({ source, onCreated }: CreatePlaylistProps) => {
  const t = useI18n()
  const theme = useTheme()
  const dialogRef = useRef<DialogType>(null)
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleShow = () => {
    if (!visible) setVisible(true)
    requestAnimationFrame(() => {
      dialogRef.current?.setVisible(true)
    })
  }

  const handleCancel = () => {
    dialogRef.current?.setVisible(false)
  }

  const handleHide = () => {
    setVisible(false)
    setName('')
    setCreating(false)
  }

  const handleCreate = async() => {
    const playlistName = name.trim()
    if (!playlistName) {
      toast(t('setting_basic_netease_playlist_name_required'))
      return
    }

    setCreating(true)
    try {
      await songListApi.createPlaylist(playlistName)
      toast(t('setting_basic_netease_playlist_create_success'))
      handleCancel()
      onCreated()
    } catch (err) {
      toast(String((err as Error)?.message || t('setting_basic_netease_playlist_create_failed')), 'long')
    } finally {
      setCreating(false)
    }
  }

  if (source != 'wy') return null

  return (
    <>
      <Button style={styles.button} onPress={handleShow}>
        <Text>{t('setting_basic_netease_playlist_create')}</Text>
      </Button>
      {
        visible
          ? (
              <Dialog title={t('setting_basic_netease_playlist_create_title')} height="32%" ref={dialogRef} bgHide={false} onHide={handleHide}>
                <View style={styles.content}>
                  <Input
                    value={name}
                    onChangeText={setName}
                    style={{ ...styles.input, backgroundColor: theme['c-primary-input-background'] }}
                    placeholder={t('setting_basic_netease_playlist_name_placeholder')}
                  />
                </View>
                <View style={styles.btns}>
                  <Button disabled={creating} style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleCreate}>
                    <Text size={14} color={theme['c-button-font']}>{t('confirm')}</Text>
                  </Button>
                  <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleCancel}>
                    <Text size={14} color={theme['c-button-font']}>{t('cancel')}</Text>
                  </Button>
                </View>
              </Dialog>
            )
          : null
      }
    </>
  )
})

const styles = createStyle({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
    paddingRight: 12,
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  input: {
    alignSelf: 'stretch',
    height: 36,
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    paddingLeft: 15,
  },
  btn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 4,
    marginRight: 15,
  },
})
