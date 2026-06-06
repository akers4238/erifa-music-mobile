import { useMemo, useRef } from 'react'

import DorpDownMenu, { type DorpDownMenuProps as _DorpDownMenuProps } from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import ScriptImportExport, { type ScriptImportExportType } from './ScriptImportExport'
import ScriptImportOnline, { type ScriptImportOnlineType } from './ScriptImportOnline'
import { state } from '@/store/userApi'
import { tipDialog } from '@/utils/tools'

import { useTheme } from '@/store/theme/hook'

interface BtnProps {
  btnStyle?: _DorpDownMenuProps<any[]>['btnStyle']
}


export default ({ btnStyle }: BtnProps) => {
  const theme = useTheme()
  const scriptImportExportRef = useRef<ScriptImportExportType>(null)
  const scriptImportOnlineRef = useRef<ScriptImportOnlineType>(null)

  const importTypes = useMemo(() => {
    return [
      { action: 'local', label: '本地导入' },
      { action: 'online', label: '在线导入' },
    ] as const
  }, [])

  type DorpDownMenuProps = _DorpDownMenuProps<typeof importTypes>

  const handleAction: DorpDownMenuProps['onPress'] = ({ action }) => {
    if (state.list.length > 20) {
      void tipDialog({
        message: '最多只能同时存在 20 个插件，请先卸载一些旧插件再继续导入。',
        btnText: '知道了',
      })
      return
    }

    if (action == 'local') {
      scriptImportExportRef.current?.import()
    } else {
      scriptImportOnlineRef.current?.show()
    }
  }


  return (
    <DorpDownMenu
      btnStyle={btnStyle}
      menus={importTypes}
      center
      onPress={handleAction}
    >
      <Text size={14} color={theme['c-button-font']}>导入</Text>
      <ScriptImportExport ref={scriptImportExportRef} />
      <ScriptImportOnline ref={scriptImportOnlineRef} />
    </DorpDownMenu>
  )
}
