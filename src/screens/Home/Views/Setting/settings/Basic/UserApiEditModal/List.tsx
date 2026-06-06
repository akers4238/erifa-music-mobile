import { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react'
import Text from '@/components/common/Text'
import { View, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { clipboardWriteText, confirmDialog, createStyle, tipDialog, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useUserApiList, state as userApiState } from '@/store/userApi'
import { useSettingValue } from '@/store/setting/hook'
import { importMusicFreePluginItem, importMusicFreePluginSheet, removeUserApi, setUserApiAlternativePlugin, setUserApiUserVariables } from '@/core/userApi'
import { createList } from '@/core/list'
import { BorderRadius } from '@/theme'
import { Icon } from '@/components/common/Icon'
import settingState from '@/store/setting/state'
import { setApiSource } from '@/core/apiSource'
import Input from '@/components/common/Input'

const z = {
  unknown: '\u672a\u77e5',
  saveVariables: '\u4fdd\u5b58\u7528\u6237\u53d8\u91cf',
  addressMissing: '\u8fd9\u4e2a\u63d2\u4ef6\u6ca1\u6709\u63d0\u4f9b\u66f4\u65b0\u5730\u5740',
  addressCopied: '\u63d2\u4ef6\u5730\u5740\u5df2\u590d\u5236',
  redirectSaved: '\u97f3\u6e90\u91cd\u5b9a\u5411\u5df2\u4fdd\u5b58',
  redirectCleared: '\u5df2\u53d6\u6d88\u97f3\u6e90\u91cd\u5b9a\u5411',
  saveFailed: '\u4fdd\u5b58\u5931\u8d25',
  inputLink: '\u8bf7\u8f93\u5165\u94fe\u63a5\u6216 ID',
  noSongs: '\u6ca1\u6709\u5bfc\u5165\u5230\u6b4c\u66f2',
  importMusicList: '\u5bfc\u5165\u5355\u66f2',
  importSheetList: '\u5bfc\u5165\u6b4c\u5355',
  imported: '\u5df2\u5bfc\u5165',
  songUnit: '\u9996\u6b4c\u66f2',
  importFailed: '\u5bfc\u5165\u5931\u8d25',
  ok: '\u77e5\u9053\u4e86',
  version: '\u7248\u672c\u53f7',
  author: '\u4f5c\u8005',
  supportSearch: '\u652f\u6301\u641c\u7d22',
  noSearch: '\u4e0d\u652f\u6301\u641c\u7d22',
  supportPlay: '\u652f\u6301\u64ad\u653e',
  noPlay: '\u4e0d\u652f\u6301\u64ad\u653e',
  redirect: '\u97f3\u6e90\u91cd\u5b9a\u5411',
  updatePlugin: '\u66f4\u65b0\u63d2\u4ef6',
  sharePlugin: '\u5206\u4eab\u63d2\u4ef6',
  uninstallPlugin: '\u5378\u8f7d\u63d2\u4ef6',
  importSheet: '\u5bfc\u5165\u6b4c\u5355',
  importMusic: '\u5bfc\u5165\u5355\u66f2',
  userVariables: '\u7528\u6237\u53d8\u91cf',
  chooseParser: '\u9009\u62e9\u7528\u4e8e\u89e3\u6790\u64ad\u653e\u94fe\u63a5\u7684\u63d2\u4ef6',
  noRedirect: '\u4e0d\u91cd\u5b9a\u5411',
  sheetPlaceholder: '\u8f93\u5165\u6b4c\u5355\u94fe\u63a5\u6216 ID',
  musicPlaceholder: '\u8f93\u5165\u5355\u66f2\u94fe\u63a5\u6216 ID',
  importing: '\u5bfc\u5165\u4e2d',
  confirmImport: '\u786e\u8ba4\u5bfc\u5165',
  removeConfirm: '\u786e\u5b9a\u8981\u5378\u8f7d\u63d2\u4ef6',
  cancel: '\u53d6\u6d88',
  uninstall: '\u5378\u8f7d',
  variablesSaved: '\u7528\u6237\u53d8\u91cf\u5df2\u4fdd\u5b58',
  empty: '\u8fd8\u6ca1\u6709\u5bfc\u5165\u63d2\u4ef6',
}

const formatVersionName = (version?: string) => {
  if (!version) return z.unknown
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
        <Text size={12} color={theme['c-button-font']}>{z.saveVariables}</Text>
      </TouchableOpacity>
    </View>
  )
}

type OpenPanel = 'variables' | 'alternative' | 'importSheet' | 'importMusic' | null

const ListItem = ({ item, activeId, plugins, onActive, onDisable, onRemove, onSaveUserVariables }: {
  item: LX.UserApi.UserApiInfo
  activeId: string
  plugins: LX.UserApi.UserApiInfo[]
  onActive: (id: string) => void
  onDisable: () => void
  onRemove: (id: string, name: string) => void
  onSaveUserVariables: (id: string, values: Record<string, string>) => void
}) => {
  const theme = useTheme()
  const isActive = activeId == item.id
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const homepage = item.homepage || ''
  const supportsSearch = hasAction(item, 'search')
  const supportsMusicUrl = hasAction(item, 'musicUrl')
  const supportsImportSheet = hasAction(item, 'importMusicSheet')
  const supportsImportMusic = hasAction(item, 'importMusicItem')
  const alternativePlugins = plugins.filter(plugin => plugin.id != item.id && hasAction(plugin, 'musicUrl'))
  const alternativePluginName = plugins.find(plugin => plugin.id == item.alternativePluginId)?.name

  useEffect(() => {
    if (openPanel == 'variables' && !item.userVariables?.length) setOpenPanel(null)
    if (openPanel == 'alternative' && !alternativePlugins.length) setOpenPanel(null)
  }, [alternativePlugins.length, item.userVariables, openPanel])

  const togglePanel = (panel: OpenPanel) => {
    setImportText('')
    setOpenPanel(openPanel == panel ? null : panel)
  }

  const handleToggleActive = (enabled: boolean) => {
    if (enabled) onActive(item.id)
    else if (isActive) onDisable()
  }

  const handleShare = () => {
    if (!homepage) {
      toast(z.addressMissing)
      return
    }
    clipboardWriteText(homepage)
    toast(z.addressCopied)
  }

  const handleSetAlternativePlugin = (alternativePluginId: string | null) => {
    void setUserApiAlternativePlugin(item.id, alternativePluginId).then(() => {
      toast(alternativePluginId ? z.redirectSaved : z.redirectCleared)
      setOpenPanel(null)
    }).catch((err: any) => {
      toast(`${z.saveFailed}: ${err.message || 'unknown error'}`, 'long')
    })
  }

  const handleImport = async(type: 'music' | 'sheet') => {
    const text = importText.trim()
    if (!text) {
      toast(z.inputLink)
      return
    }
    setImporting(true)
    try {
      const list = type == 'music'
        ? [await importMusicFreePluginItem(item.id, text)].filter(Boolean) as LX.Music.MusicInfoOnline[]
        : await importMusicFreePluginSheet(item.id, text)
      if (!list.length) {
        toast(z.noSongs, 'long')
        return
      }
      await createList({
        name: `${item.name} ${type == 'music' ? z.importMusicList : z.importSheetList}`,
        list,
        source: list[0]?.source as LX.OnlineSource,
        sourceListId: `${item.id}_${Date.now()}`,
      })
      toast(`${z.imported} ${list.length} ${z.songUnit}`)
      setImportText('')
      setOpenPanel(null)
    } catch (err: any) {
      toast(`${z.importFailed}: ${err.message || 'unknown error'}`, 'long')
    } finally {
      setImporting(false)
    }
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
                      btnText: z.ok,
                    })
                  }}>
                    <Icon name="help" size={14} color={theme['c-font-label']} />
                  </TouchableOpacity>
                )
                : null
            }
          </View>
          <View style={styles.metaRow}>
            <Text size={12} color={theme['c-font-label']}>{z.version}: {formatVersionName(item.version)}</Text>
            <Text size={12} color={theme['c-font-label']}>{z.author}: {item.author || z.unknown}</Text>
          </View>
          <Text size={12} color={theme['c-font-label']}>
            {supportsSearch ? z.supportSearch : z.noSearch} - {supportsMusicUrl ? z.supportPlay : z.noPlay}
          </Text>
          {
            alternativePluginName
              ? <Text size={12} color={theme['c-font-label']}>{z.redirect}: {alternativePluginName}</Text>
              : null
          }
        </View>
        <Switch
          value={isActive}
          onValueChange={handleToggleActive}
          trackColor={{ false: theme['c-500'], true: theme['c-primary'] }}
          thumbColor={theme['c-button-font']}
        />
      </View>
      <View style={styles.actions}>
        <ActionButton icon="download-2" label={z.updatePlugin} disabled={!homepage} onPress={handleShare} />
        <ActionButton icon="share" label={z.sharePlugin} disabled={!homepage} onPress={handleShare} />
        <ActionButton icon="remove" label={z.uninstallPlugin} onPress={() => { onRemove(item.id, item.name) }} />
        <ActionButton icon="slider" label={z.redirect} disabled={!supportsMusicUrl || !alternativePlugins.length} onPress={() => { togglePanel('alternative') }} />
        <ActionButton icon="exit" label={z.importSheet} disabled={!supportsImportSheet} onPress={() => { togglePanel('importSheet') }} />
        <ActionButton icon="add-music" label={z.importMusic} disabled={!supportsImportMusic} onPress={() => { togglePanel('importMusic') }} />
        <ActionButton icon="sd-card" label={z.userVariables} disabled={!item.userVariables?.length} onPress={() => { togglePanel('variables') }} />
      </View>
      {
        openPanel == 'variables'
          ? <UserVariables item={item} onSaveUserVariables={onSaveUserVariables} />
          : null
      }
      {
        openPanel == 'alternative'
          ? (
            <View style={styles.panelBlock}>
              <Text size={12} color={theme['c-font-label']}>{z.chooseParser}</Text>
              <View style={styles.choiceWrap}>
                <TouchableOpacity style={{ ...styles.choiceBtn, backgroundColor: !item.alternativePluginId ? theme['c-button-background'] : 'transparent' }} onPress={() => { handleSetAlternativePlugin(null) }}>
                  <Text size={12} color={!item.alternativePluginId ? theme['c-button-font'] : theme['c-font']}>{z.noRedirect}</Text>
                </TouchableOpacity>
                {
                  alternativePlugins.map(plugin => (
                    <TouchableOpacity key={plugin.id} style={{ ...styles.choiceBtn, backgroundColor: item.alternativePluginId == plugin.id ? theme['c-button-background'] : 'transparent' }} onPress={() => { handleSetAlternativePlugin(plugin.id) }}>
                      <Text size={12} color={item.alternativePluginId == plugin.id ? theme['c-button-font'] : theme['c-font']}>{plugin.name}</Text>
                    </TouchableOpacity>
                  ))
                }
              </View>
            </View>
            )
          : null
      }
      {
        openPanel == 'importSheet' || openPanel == 'importMusic'
          ? (
            <View style={styles.panelBlock}>
              <Input
                value={importText}
                onChangeText={setImportText}
                placeholder={openPanel == 'importSheet' ? item.hints?.importMusicSheet?.[0] || z.sheetPlaceholder : item.hints?.importMusicItem?.[0] || z.musicPlaceholder}
                clearBtn
                size={12}
                style={{ ...styles.importInput, backgroundColor: theme['c-primary-input-background'] }}
              />
              <TouchableOpacity
                style={{ ...styles.saveBtn, backgroundColor: theme['c-button-background'] }}
                onPress={() => { void handleImport(openPanel == 'importSheet' ? 'sheet' : 'music') }}
                disabled={importing}
              >
                <Text size={12} color={theme['c-button-font']}>{importing ? z.importing : z.confirmImport}</Text>
              </TouchableOpacity>
            </View>
            )
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
      message: `${z.removeConfirm} "${name}"?`,
      cancelButtonText: z.cancel,
      confirmButtonText: z.uninstall,
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
    toast(z.variablesSaved)
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
                plugins={sortedList}
                onActive={handleActive}
                onDisable={handleDisable}
                onRemove={handleRemove}
                onSaveUserVariables={handleSaveUserVariables}
              />
              )
            })
            : <Text style={styles.tipText} color={theme['c-font-label']}>{z.empty}</Text>
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
  panelBlock: {
    marginTop: 12,
    gap: 8,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceBtn: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  importInput: {
    minHeight: 32,
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
