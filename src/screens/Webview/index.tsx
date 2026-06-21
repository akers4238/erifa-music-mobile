import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { BackHandler, Linking, TouchableOpacity, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import WebView from 'react-native-webview'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { COMPONENT_IDS } from '@/config/constant'
import { setComponentId } from '@/core/common'
import { useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle, toast } from '@/utils/tools'
import { pop } from '@/navigation/utils'

const DEFAULT_UA = 'Mozilla/5.0 (Linux; Android 15; Mobile; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/137.0.7151.118 Mobile Safari/537.36 EMusic/1.0'

const getIntentFallbackUrl = (url: string) => {
  if (!url.startsWith('intent://')) return ''
  const match = /(?:^|;)S\.browser_fallback_url=([^;]+)/.exec(url)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

const isWebUrl = (url: string) => /^(https?:|about:blank)/i.test(url)

export default memo(({ componentId, url, title }: { componentId: string, url: string, title?: string }) => {
  const theme = useTheme()
  const statusbarHeight = useStatusbarHeight()
  const webviewRef = useRef<WebView>(null)
  const [webViewKey, setWebViewKey] = useState(0)
  const [currentUrl, setCurrentUrl] = useState(url)
  const [pageTitle, setPageTitle] = useState(title ?? url)
  const [canGoBack, setCanGoBack] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleClose = useCallback(() => {
    void pop(componentId)
  }, [componentId])

  const handleBack = useCallback(() => {
    if (canGoBack) {
      webviewRef.current?.goBack()
      return true
    }
    handleClose()
    return true
  }, [canGoBack, handleClose])

  const handleReload = useCallback(() => {
    webviewRef.current?.reload()
  }, [])

  const handleCopy = useCallback(() => {
    Clipboard.setString(currentUrl)
    toast(global.i18n.t('copy_name_tip'))
  }, [currentUrl])

  const handleOpenExternal = useCallback(() => {
    void Linking.openURL(currentUrl)
  }, [currentUrl])

  const handleShouldStartLoad = useCallback(({ url }: { url: string }) => {
    if (isWebUrl(url)) return true
    const fallbackUrl = getIntentFallbackUrl(url)
    if (/^https?:/i.test(fallbackUrl)) {
      setCurrentUrl(fallbackUrl)
      setWebViewKey(key => key + 1)
      return false
    }
    void Linking.openURL(url).catch(() => {})
    return false
  }, [])

  useEffect(() => {
    setComponentId(COMPONENT_IDS.webview, componentId)
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack)
    return () => {
      subscription.remove()
    }
  }, [componentId, handleBack])

  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-content-background'] }}>
      <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'], paddingTop: statusbarHeight, height: 54 + statusbarHeight }}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <Icon name="chevron-left" color={theme['c-button-font']} size={22} />
        </TouchableOpacity>
        <View style={styles.titleContent}>
          <Text numberOfLines={1} color={theme['c-font']} size={15}>{pageTitle}</Text>
          <Text numberOfLines={1} color={theme['c-500']} size={11}>{currentUrl}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={handleReload}>
          <Icon name="available_updates" color={theme['c-button-font']} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.textBtn} onPress={handleCopy}>
          <Text color={theme['c-button-font']} size={12}>{global.i18n.t('webview_copy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handleOpenExternal}>
          <Icon name="share" color={theme['c-button-font']} size={18} />
        </TouchableOpacity>
      </View>
      {
        progress > 0 && progress < 1
          ? <View style={{ ...styles.progress, backgroundColor: theme['c-primary'], width: `${Math.max(5, progress * 100)}%` }} />
          : null
      }
      <WebView
        ref={webviewRef}
        key={webViewKey}
        source={{ uri: currentUrl }}
        userAgent={DEFAULT_UA}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        cacheEnabled
        allowFileAccess
        allowsInlineMediaPlayback
        setSupportMultipleWindows
        javaScriptCanOpenWindowsAutomatically
        mixedContentMode="always"
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={state => {
          setCanGoBack(state.canGoBack)
          if (state.url) setCurrentUrl(state.url)
          if (state.title) setPageTitle(state.title)
        }}
        onLoadProgress={({ nativeEvent }) => {
          setProgress(nativeEvent.progress)
        }}
        onRenderProcessGone={() => {
          setWebViewKey(key => key + 1)
        }}
        style={styles.webview}
      />
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 42,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtn: {
    width: 46,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContent: {
    flex: 1,
    paddingRight: 5,
  },
  progress: {
    height: 2,
  },
  webview: {
    flex: 1,
  },
})
