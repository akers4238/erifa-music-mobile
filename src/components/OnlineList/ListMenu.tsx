import { useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import Menu, { type MenuType, type Position } from '@/components/common/Menu'
import { syncWyLoveMusic } from '@/core/list'
import { toast } from '@/utils/tools'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfoOnline
  selectedList: LX.Music.MusicInfoOnline[]
  index: number
  single: boolean
}
const initSelectInfo = {}

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onDownload: (selectInfo: SelectInfo) => void
  onCopyName: (selectInfo: SelectInfo) => void
  onMusicSourceDetail: (selectInfo: SelectInfo) => void
  onDislikeMusic: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position: Position) => void
}

export type {
  Position,
}

export default forwardRef<ListMenuType, ListMenuProps>((props: ListMenuProps, ref) => {
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const menuRef = useRef<MenuType>(null)
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo)
  const [isNeteaseMusic, setNeteaseMusic] = useState(false)

  useImperativeHandle(ref, () => ({
    show(selectInfo, position) {
      selectInfoRef.current = selectInfo
      setNeteaseMusic(selectInfo.musicInfo.source == 'wy')
      if (visible) menuRef.current?.show(position)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          menuRef.current?.show(position)
        })
      }
    },
  }))

  const menus = useMemo(() => {
    return [
      { action: 'play', label: t('play') },
      { action: 'playLater', label: t('play_later') },
      { action: 'download', label: t('download_music') },
      { action: 'add', label: t('add_to') },
      { action: 'copyName', label: t('copy_name') },
      { action: 'musicSourceDetail', label: t('music_source_detail') },
      ...(isNeteaseMusic
        ? [
            { action: 'neteaseLoveAdd', label: '添加至网易云我的喜欢' },
            { action: 'neteaseLoveRemove', label: '取消网易云我的喜欢' },
          ] as const
        : []),
    ] as const
  }, [t, isNeteaseMusic])

  const handleMenuPress = ({ action }: typeof menus[number]) => {
    const selectInfo = selectInfoRef.current
    switch (action) {
      case 'play':
        props.onPlay(selectInfo)
        break
      case 'playLater':
        props.onPlayLater(selectInfo)
        break
      case 'add':
        props.onAdd(selectInfo)
        break
      case 'download':
        props.onDownload(selectInfo)
        break
      case 'copyName':
        props.onCopyName(selectInfo)
        break
      case 'musicSourceDetail':
        props.onMusicSourceDetail(selectInfo)
        // setVIsibleMusicPosition(true)
        break
      case 'neteaseLoveAdd':
        void syncWyLoveMusic([selectInfo.musicInfo], true).then(() => {
          toast('已添加至网易云我的喜欢')
        }).catch(err => {
          toast(`添加至网易云我的喜欢失败：${err?.message || err}`)
        })
        break
      case 'neteaseLoveRemove':
        void syncWyLoveMusic([selectInfo.musicInfo], false).then(() => {
          toast('已取消网易云我的喜欢')
        }).catch(err => {
          toast(`取消网易云我的喜欢失败：${err?.message || err}`)
        })
        break
      default:
        break
    }
  }

  return (
    visible
      ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} />
      : null
  )
})
