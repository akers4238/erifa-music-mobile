import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { type NativeScrollEvent, type NativeSyntheticEvent, View, TouchableOpacity, Animated } from 'react-native'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { type Lines } from 'lrc-file-parser'
import { useTheme } from '@/store/theme/hook'
import { formatPlayTime2 } from '@/utils'
import { Icon } from '@/components/common/Icon'


export interface PlayLineType {
  updateScrollInfo: (scrollInfo: NativeSyntheticEvent<NativeScrollEvent>['nativeEvent'] | null) => void
  updateLayoutInfo: (listLayoutInfo: { spaceHeight: number, lineHeights: number[] }) => void
  updateLyricLines: (lyricLines: Lines) => void
  selectLine: (lineNum: number) => void
  setVisible: (visible: boolean) => void
}

export interface PlayLineProps {
  onPlayLine: (time: number) => void
}

const ANIMATION_DURATION = 300

export default forwardRef<PlayLineType, PlayLineProps>(({ onPlayLine }, ref) => {
  const theme = useTheme()
  const [scrollInfo, setScrollInfo] = useState<NativeSyntheticEvent<NativeScrollEvent>['nativeEvent'] | null>(null)
  const [listLayoutInfo, setListLayoutInfo] = useState<{ spaceHeight: number, lineHeights: number[] }>({ spaceHeight: 0, lineHeights: [] })
  const [lyricLines, setLyricLines] = useState<Lines>([])
  const [selectedLineNum, setSelectedLineNum] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const opsAnim = useRef<Animated.Value>(
    new Animated.Value(0),
  ).current

  const setShow = (visible: boolean) => {
    Animated.timing(opsAnim, {
      toValue: visible ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      if (!visible) setVisible(false)
    })
  }

  useImperativeHandle(ref, () => ({
    updateScrollInfo(scrollInfo) {
      setScrollInfo(scrollInfo)
    },
    updateLayoutInfo(listLayoutInfo) {
      setListLayoutInfo(listLayoutInfo)
    },
    updateLyricLines(lyricLines) {
      setLyricLines(lyricLines)
    },
    selectLine(lineNum) {
      setSelectedLineNum(lineNum)
      setVisible(true)
      requestAnimationFrame(() => {
        setShow(true)
      })
    },
    setVisible(visible) {
      if (visible) {
        setVisible(true)
      } else {
        setSelectedLineNum(null)
      }
      requestAnimationFrame(() => {
        setShow(visible)
      })
      // setVisible()
    },
  }))

  const handlePlayLine = () => {
    onPlayLine(time / 1000)
  }

  if (!visible) return null
  let targetLineNum = selectedLineNum
  if (targetLineNum == null) {
    if (!scrollInfo) return null
    const offset = scrollInfo.contentOffset.y + scrollInfo.layoutMeasurement.height * 0.4
    let lineOffset = listLayoutInfo.spaceHeight
    targetLineNum = -1
    for (let line = 0; line < listLayoutInfo.lineHeights.length; line++) {
      lineOffset += listLayoutInfo.lineHeights[line]
      if (lineOffset < offset) continue
      targetLineNum = line
      break
    }
    if (targetLineNum == -1) targetLineNum = listLayoutInfo.lineHeights.length - 1
  }
  const time = lyricLines[targetLineNum]?.time ?? 0
  const timeLabel = formatPlayTime2(time / 1000)
  return (
    <Animated.View style={{ ...styles.playLine, opacity: opsAnim }}>
      <Text style={styles.label} color={theme['c-primary-font']} size={13}>{timeLabel}</Text>
      <View style={styles.lineContent}>
        <View style={{ ...styles.lineShadow, backgroundColor: theme['c-content-background'] }}>
          <View style={{ ...styles.line, backgroundColor: theme['c-primary-font'] }} />
        </View>
        <TouchableOpacity style={styles.button} onPress={handlePlayLine}>
          <Icon name="play" color={theme['c-button-font']} size={18} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
})

const styles = createStyle({
  playLine: {
    position: 'absolute',
    width: '100%',
    top: '40%',
    left: 0,
    height: 20,
    marginTop: -10,
    zIndex: 10,
    elevation: 10,
    overflow: 'visible',
    // paddingTop: 5,
    // paddingBottom: 5,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  label: {
    position: 'absolute',
    right: 45,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  lineContent: {
    // backgroundColor: 'rgba(0,0,0,0.1)',
    position: 'absolute',
    width: '100%',
    height: 20,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  line: {
    flex: 1,
    height: 3,
    borderRadius: 3,
  },
  lineShadow: {
    marginLeft: 30,
    flex: 1,
    height: 7,
    borderRadius: 7,
    padding: 2,
    opacity: 0.95,
  },
  button: {
    flex: 0,
    paddingLeft: 5,
    paddingRight: 15,
  },
})
