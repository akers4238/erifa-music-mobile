import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { type NativeScrollEvent, type NativeSyntheticEvent, View, TouchableOpacity, Animated } from 'react-native'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { type Lines } from 'lrc-file-parser'
import { useTheme } from '@/store/theme/hook'
import { formatPlayTime2 } from '@/utils'
import { Icon } from '@/components/common/Icon'
import { BorderWidths } from '@/theme'


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

const ANIMATION_DURATION = 200
const LINE_POSITION_RATIO = 0.4

export default forwardRef<PlayLineType, PlayLineProps>(({ onPlayLine }, ref) => {
  const theme = useTheme()
  const [scrollInfo, setScrollInfo] = useState<NativeSyntheticEvent<NativeScrollEvent>['nativeEvent'] | null>(null)
  const [listLayoutInfo, setListLayoutInfo] = useState<{ spaceHeight: number, lineHeights: number[] }>({ spaceHeight: 0, lineHeights: [] })
  const [lyricLines, setLyricLines] = useState<Lines>([])
  const [selectedLineNum, setSelectedLineNum] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)
  const opacityAnim = useRef(new Animated.Value(0)).current

  const setShow = (show: boolean) => {
    Animated.timing(opacityAnim, {
      toValue: show ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      if (!show) setVisible(false)
    })
  }

  useImperativeHandle(ref, () => ({
    updateScrollInfo(info) {
      setScrollInfo(info)
    },
    updateLayoutInfo(info) {
      setListLayoutInfo(info)
    },
    updateLyricLines(lines) {
      setLyricLines(lines)
    },
    selectLine(lineNum) {
      setSelectedLineNum(lineNum)
      setVisible(true)
      requestAnimationFrame(() => {
        setShow(true)
      })
    },
    setVisible(v) {
      if (v) {
        setSelectedLineNum(null)
        setVisible(true)
      } else {
        setSelectedLineNum(null)
      }
      requestAnimationFrame(() => {
        setShow(v)
      })
    },
  }))

  const targetLineNum = useMemo(() => {
    if (selectedLineNum != null) return selectedLineNum
    if (!scrollInfo) return null
    if (!listLayoutInfo.lineHeights.length) return null
    const offset = scrollInfo.contentOffset.y + scrollInfo.layoutMeasurement.height * LINE_POSITION_RATIO
    let lineOffset = listLayoutInfo.spaceHeight
    let found = -1
    for (let line = 0; line < listLayoutInfo.lineHeights.length; line++) {
      lineOffset += listLayoutInfo.lineHeights[line] || 0
      if (lineOffset < offset) continue
      found = line
      break
    }
    return found === -1 ? listLayoutInfo.lineHeights.length - 1 : found
  }, [selectedLineNum, scrollInfo, listLayoutInfo])

  const time = useMemo(() => {
    if (targetLineNum == null || targetLineNum < 0 || targetLineNum >= lyricLines.length) return 0
    return lyricLines[targetLineNum]?.time ?? 0
  }, [targetLineNum, lyricLines])

  const timeLabel = useMemo(() => {
    return formatPlayTime2(Math.max(0, time) / 1000)
  }, [time])

  const handlePlayLine = () => {
    if (!lyricLines.length) return
    const num = targetLineNum
    if (num == null || num < 0 || num >= lyricLines.length) return
    const t = lyricLines[num]?.time
    if (t == null) return
    onPlayLine(t / 1000)
  }

  if (!visible) return null
  if (targetLineNum == null) return null
  if (targetLineNum < 0 || targetLineNum >= lyricLines.length) return null

  return (
    <Animated.View pointerEvents="box-none" style={{ ...styles.container, opacity: opacityAnim }}>
      <Text style={styles.label} color={theme['c-primary']} size={12}>{timeLabel}</Text>
      <View style={styles.lineContent}>
        <View style={{ ...styles.line, borderBottomColor: theme['c-primary-alpha-700'] }} />
        <TouchableOpacity style={styles.playBtn} onPress={handlePlayLine}>
          <Icon name="play" color={theme['c-primary']} size={18} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
})

const styles = createStyle({
  container: {
    position: 'absolute',
    width: '100%',
    left: 0,
    top: '40%',
    height: 20,
    marginTop: -10,
    zIndex: 10,
    elevation: 10,
    overflow: 'visible',
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
    position: 'absolute',
    width: '100%',
    height: 20,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  line: {
    marginLeft: 30,
    borderBottomWidth: BorderWidths.normal2,
    borderStyle: 'dashed',
    flex: 1,
  },
  playBtn: {
    width: 34,
    height: 34,
    paddingRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
