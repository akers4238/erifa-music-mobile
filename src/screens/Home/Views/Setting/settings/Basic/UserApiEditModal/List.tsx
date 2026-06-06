import { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react'
import Text from '@/components/common/Text'
import { View, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { clipboardWriteText, confirmDialog, createStyle, tipDialog, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useUserApiList, state as userApiState } from '@/store/userApi'
import { useSettingValue } from '@/store/setting/hook'
import { removeUserApi, setUserApiUserVariables } from '@/core/userApi'
import { BorderRadius } from '@/theme'
import { Icon } from '@/components/common/Icon'
import settingState from '@/store/setting/state'
import { setApiSource } from '@/core/apiSource'
import Input from '@/components/common/Input'

const formatVersionName = (version?: string) => {
  if (!version) return '未知'
  return /^\d/.test(version) ? `v${version}` : version
}

const hasAction = (item: LX.UserApi.UserApiInfo, action: string) => {
  return !!item.sources && Object.values(item.sources).some(source => source.actions.includes(action as any))
}

const ActionButton = ({ icon, label, onPress, disabled = false }: {
  icon: ComponentProps<typeof Icon>['name']
  label: string
  onPress: () => void
  disabled?: boolean
}) => {
  const theme = useTheme()
  return (
    <TouchableOpacity style={{ ...styles.actionBtn, opacity: disabled ? 0.35 : 1 }} onPress={onPress} disabled={disabled}>
      <Icon name={icon} size={14} color={theme['c-font']} />
      <Text size={12}>{label}</Text>
    </TouchableOpacity>
  )
}

const UserVariables = ({ item, onSaveUserVariables }: {
  item: LX.UserApi.UserApiInfo
  onSaveUserVariables: (id: string, values: Record<string, string>) => void
}) => {
  const theme = useTheme()
  const [userVariablesValue, setUserVariablesValue] = useState<Record<string, string>>(item.userVariablesValue ?? {})

  useEffect(() => {
    setUserVariablesValue(item.userVariablesValue ?? {})
  }, [item.id, item.userVariablesValue])

  if (!item.userVariables?.length) return null

  const handleChangeUserVariable = (key: string, value: string) => {
    setUserVariablesValue({
      ...userVariablesValue,
      [key]: value,
    })
  }

  return (
    <View style={styles.variableBlock}>
      {
        item.userVariables.map(variable => (
          <View key={variable.key} style={styles.variableRow}>
            <Text style={styles.variableLabel} size={12} color={theme['c-font-label']}>{variable.name || variable.key}</Text>
            <Input
              value={userVariablesValue[variable.key] ?? ''}
              placeholder={variable.hint}
              clearBtn
              size={12}
              style={{ ...styles.variableInput, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-input-background'] }}
              onChangeText={(value) => { handleChangeUserVariable(variable.key, value) }}
            />
          </View>
        ))
      }
      <TouchableOpacity style={{ ...styles.saveBtn, backgroundColor: theme['c-button-background'] }} onPress={() => { onSaveUserVariables(item.id, userVariablesValue) }}>
        <Text size={12} color={theme['c-button-font']}>保存用户变量</Text>
      </TouchableOpacity>
    </View>
  )
}

const ListItem = ({ item, activeId, onActive, onDisable, onRemove, onSaveUserVariables }: {
  item: LX.UserApi.UserApiInfo
  activeId: string
  onActive: (id: string) => void
  onDisable: () => void
  onRemove: (id: string, name: string) => void
  onSaveUserVariables: (id: string, values: Record<string, string>) => void
}) => {
  const theme = useTheme()
  const isActive = activeId == item.id
  const [showVariables, setShowVariables] = useState(false)
  const homepage = item.homepage || ''
  const supportsSearch = hasAction(item, 'search')
  const supportsMusicUrl = hasAction(item, 'musicUrl')
  const supportsImportSheet = hasAction(item, 'importMusicSheet')
  const supportsImportMusic = hasAction(item, 'importMusicItem')

  useEffect(() => {
    if (!item.userVariables?.length) setShowVariables(false)
  }, [item.userVariables])

  const handleToggleActive = (enabled: boolean) => {
    if (enabled) onActive(item.id)
    else if (isActive) onDisable()
  }

  const handleShare = () => {
    if (!homepage) {
      toast('这个插件没有提供更新地址')
      return
    }
    clipboardWriteText(homepage)
    toast('插件地址已复制')
  }

  const handleUnavailable = (label: string) => {
    void tipDialog({
      title: label,
      message: '这个入口已经按 MusicFree 的插件能力显示出来，但当前 lx 侧的歌单写入面板还没有完全接上。下一步会继续把导入结果接到本地歌单。',
      btnText: '知道了',
    })
  }

  return (
    <View style={{ ...styles.card, backgroundColor: isActive ? theme['c-primary-background-active'] : theme['c-primary-background'] }}>
      <View style={styles.cardHeader}>
        <View style={styles.titleBlock}>
          <View style={styles.nameRow}>
            <Text size={15} style={styles.pluginName}>{item.name}</Text>
            {
              item.description
                ? (
                  <TouchableOpacity onPress={() => {
                    void tipDialog({
                      title: item.name,
                      message: item.description,
                      btnText: '知道了',
                    })
                  }}>
                    <Icon name="help" size={14} color={theme['c-font-label']} />
                  </TouchableOpacity>
                )
                : null
            }
          </View>
          <View style={styles.metaRow}>
            <Text size={12} color={theme['c-font-label']}>版本号：{formatVersionName(item.version)}</Text>
            <Text size={12} color={theme['c-font-label']}>作者：{item.author || '未知'}</Text>
          </View>
          <Text size={12} color={theme['c-font-label']}>
            {supportsSearch ? '支持搜索' : '不支持搜索'} · {supportsMusicUrl ? '支持播放' : '不支持播放'}
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={handleToggleActive}
          trackColor={{ false: theme['c-500'], true: theme['c-primary'] }}
          thumbColor={theme['c-button-font']}
        />
      </View>
      <View style={styles.actions}>
        <ActionButton icon="download-2" label="更新插件" disabled={!homepage} onPress={handleShare} />
        <ActionButton icon="share" label="分享插件" disabled={!homepage} onPress={handleShare} />
        <ActionButton icon="remove" label="卸载插件" onPress={() => { onRemove(item.id, item.name) }} />
        <ActionButton icon="slider" label="音源重定向" disabled={!supportsMusicUrl} onPress={() => { handleUnavailable('音源重定向') }} />
        <ActionButton icon="exit" label="导入歌单" disabled={!supportsImportSheet} onPress={() => { handleUnavailable('导入歌单') }} />
        <ActionButton icon="add-music" label="导入单曲" disabled={!supportsImportMusic} onPress={() => { handleUnavailable('导入单曲') }} />
        <ActionButton icon="sd-card" label="用户变量" disabled={!item.userVariables?.length} onPress={() => { setShowVariables(!showVariables) }} />
      </View>
      {
        showVariables
          ? <UserVariables item={item} onSaveUserVariables={onSaveUserVariables} />
          : null
      }
    </View>
  )
}

export interface UserApiEditModalProps {
  onSave: (rules: string) => void
}
export interface UserApiEditModalType {
  show: (rules: string) => void
}

export default () => {
  const userApiList = useUserApiList()
  const apiSource = useSettingValue('common.apiSource')
  const theme = useTheme()

  const sortedList = useMemo(() => {
    return [...userApiList].sort((left, right) => {
      if (left.id == apiSource) return -1
      if (right.id == apiSource) return 1
      return left.name.localeCompare(right.name)
    })
  }, [apiSource, userApiList])

  const handleRemove = useCallback(async(id: string, name: string) => {
    const confirm = await confirmDialog({
      message: `确定要卸载插件“${name}”吗？`,
      cancelButtonText: '取消',
      confirmButtonText: '卸载',
      bgClose: false,
    })
    if (!confirm) return
    void removeUserApi([id]).finally(() => {
      if (settingState.setting['common.apiSource'] == id) {
        const backApiId = userApiState.list.find(api => api.id != id)?.id
        setApiSource(backApiId ?? '')
      }
    })
  }, [])
  const handleSaveUserVariables = useCallback((id: string, values: Record<string, string>) => {
    void setUserApiUserVariables(id, values)
    toast('用户变量已保存')
  }, [])
  const handleActive = useCallback((id: string) => {
    setApiSource(id)
  }, [])
  const handleDisable = useCallback(() => {
    setApiSource('')
  }, [])

  return (
    <ScrollView style={styles.scrollView} keyboardShouldPersistTaps={'always'}>
      <View onStartShouldSetResponder={() => true}>
        {
          sortedList.length
            ? sortedList.map((item) => {
              return (
              <ListItem
                key={item.id}
                item={item}
                activeId={apiSource}
                onActive={handleActive}
                onDisable={handleDisable}
                onRemove={handleRemove}
                onSaveUserVariables={handleSaveUserVariables}
              />
              )
            })
            : <Text style={styles.tipText} color={theme['c-font-label']}>还没有导入插件</Text>
        }
      </View>
    </ScrollView>
  )
}

const styles = createStyle({
  scrollView: {
    paddingHorizontal: 7,
    flexGrow: 0,
  },
  card: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: BorderRadius.normal,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    paddingRight: 10,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pluginName: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionBtn: {
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  variableBlock: {
    marginTop: 12,
    gap: 8,
  },
  variableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  variableLabel: {
    width: 86,
  },
  variableInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderRadius: BorderRadius.normal,
    paddingLeft: 8,
    paddingRight: 4,
  },
  saveBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  tipText: {
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 15,
  },
})
