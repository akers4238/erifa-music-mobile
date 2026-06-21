import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { type NativeScrollEvent, type NativeSyntheticEvent, View, TouchableOpacity } from 'react-native'
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

export default forwardRef<PlayLineType, PlayLineProps>(({ onPlayLine }, ref) => {
  const theme = useTheme()
  const [scrollInfo, setScrollInfo] = useState<NativeSyntheticEvent<NativeScrollEvent>['nativeEvent'] | null>(null)
  const [listLayoutInfo, setListLayoutInfo] = useState<{ spaceHeight: number, lineHeights: number[] }>({ spaceHeight: 0, lineHeights: [] })
  const [lyricLines, setLyricLines] = useState<Lines>([])
  const [selectedLineNum, setSelectedLineNum] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)

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
    },
    setVisible(v) {
      if (v) {
        setVisible(true)
      } else {
        setSelectedLineNum(null)
        setVisible(false)
      }
    },
  }))

  const handlePlayLine = () => {
    if (!lyricLines.length) return
    const targetLineNum = selectedLineNum
    if (targetLineNum == null || targetLineNum < 0 || targetLineNum >= lyricLines.length) return
    const time = lyricLines[targetLineNum]?.time
    if (time == null) return
    onPlayLine(time / 1000)
  }

  if (!visible) return null

  let targetLineNum: number
  if (selectedLineNum != null) {
    targetLineNum = selectedLineNum
  } else if (scrollInfo) {
    const offset = scrollInfo.contentOffset.y + scrollInfo.layoutMeasurement.height * 0.4
    let lineOffset = listLayoutInfo.spaceHeight || 0
    let found = -1
    for (let line = 0; line < listLayoutInfo.lineHeights.length; line++) {
      lineOffset += listLayoutInfo.lineHeights[line] || 0
      if (lineOffset < offset) continue
      found = line
      break
    }
    targetLineNum = found === -1 ? listLayoutInfo.lineHeights.length - 1 : found
  } else {
    return null
  }

  if (targetLineNum < 0 || targetLineNum >= lyricLines.length) return null

  const time = lyricLines[targetLineNum]?.time ?? 0
  const timeLabel = formatPlayTime2(Math.max(0, time) / 1000)

  const lineY = useMemo(() => {
    try {
      if (!scrollInfo || !listLayoutInfo.lineHeights.length) return null
      let y = listLayoutInfo.spaceHeight || 0
      const end = Math.min(targetLineNum, listLayoutInfo.lineHeights.length - 1)
      for (let line = 0; line <= end; line++) {
        y += listLayoutInfo.lineHeights[line] || 0
      }
      const result = y - (scrollInfo.contentOffset?.y || 0)
      if (isNaN(result)) return null
      return result
    } catch {
      return null
    }
  }, [targetLineNum, scrollInfo, listLayoutInfo])

  if (lineY == null) return null

  return (
    <View style={{ ...styles.container, top: lineY }}>
      <View style={{ ...styles.line, backgroundColor: theme['c-primary-alpha-600'] }} />
      <View style={styles.rightContent}>
        <Text color={theme['c-primary']} size={11}>{timeLabel}</Text>
        <TouchableOpacity style={styles.playBtn} onPress={handlePlayLine}>
          <Icon name="play" color={theme['c-primary']} size={16} />
        </TouchableOpacity>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
    paddingRight: 14,
  },
  line: {
    flex: 1,
    height: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  playBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
