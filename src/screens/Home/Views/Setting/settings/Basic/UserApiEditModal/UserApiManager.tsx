import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { View, TouchableOpacity } from 'react-native'
import { createStyle, openUrl } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import List from './List'
import ImportBtn from './ImportBtn'
import SearchRequest from './SearchRequest'

export default ({ onClose }: {
  onClose?: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()

  const openFAQPage = () => {
    void openUrl('https://akers4238.github.io/lx-music-doc/mobile/custom-source')
  }

  return (
    <>
      <View style={styles.content}>
        <Text size={16} style={styles.title}>{t('user_api_musicfree_title')}</Text>
        <SearchRequest />
        <List />
        <View style={styles.tips}>
          <Text style={styles.tipsText} size={12}>{t('user_api_musicfree_tip')}</Text>
          <TouchableOpacity onPress={openFAQPage}>
            <Text style={{ ...styles.tipsText, textDecorationLine: 'underline' }} size={12} color={theme['c-primary-font']}>FAQ</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.tipsText} size={12}>{t('user_api_musicfree_safe_tip')}</Text>
          </View>
        </View>
      </View>
      <View style={styles.btns}>
        {
          onClose
            ? (
                <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={onClose}>
                  <Text size={14} color={theme['c-button-font']}>{t('close')}</Text>
                </Button>
              )
            : null
        }
        <ImportBtn btnStyle={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} />
      </View>
    </>
  )
}

const styles = createStyle({
  content: {
    flexShrink: 1,
    paddingHorizontal: 8,
    paddingTop: 15,
    paddingBottom: 10,
    flexDirection: 'column',
  },
  title: {
    marginBottom: 15,
    textAlign: 'center',
  },
  tips: {
    paddingHorizontal: 7,
    marginTop: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tipsText: {
    marginTop: 8,
    textAlignVertical: 'bottom',
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
