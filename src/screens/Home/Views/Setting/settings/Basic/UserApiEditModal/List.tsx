import { useCallback, useEffect, useState } from 'react'
import Text from '@/components/common/Text'
import { View, TouchableOpacity, ScrollView } from 'react-native'
import { confirmDialog, createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useUserApiList, state as userApiState } from '@/store/userApi'
import { useSettingValue } from '@/store/setting/hook'
import { removeUserApi, setUserApiAllowShowUpdateAlert, setUserApiUserVariables } from '@/core/userApi'
import { BorderRadius } from '@/theme'
import CheckBox from '@/components/common/CheckBox'
import { Icon } from '@/components/common/Icon'
import settingState from '@/store/setting/state'
import { setApiSource } from '@/core/apiSource'
import Input from '@/components/common/Input'

const formatVersionName = (version: string) => {
  return /^\d/.test(version) ? `v${version}` : version
}
const ListItem = ({ item, activeId, onActive, onRemove, onChangeAllowShowUpdateAlert, onSaveUserVariables }: {
  item: LX.UserApi.UserApiInfo
  activeId: string
  onActive: (id: string) => void
  onRemove: (id: string, name: string) => void
  onChangeAllowShowUpdateAlert: (id: string, enabled: boolean) => void
  onSaveUserVariables: (id: string, values: Record<string, string>) => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const [userVariablesValue, setUserVariablesValue] = useState<Record<string, string>>(item.userVariablesValue ?? {})
  useEffect(() => {
    setUserVariablesValue(item.userVariablesValue ?? {})
  }, [item.id, item.userVariablesValue])
  const changeAllowShowUpdateAlert = (check: boolean) => {
    onChangeAllowShowUpdateAlert(item.id, check)
  }
  const handleActive = () => {
    onActive(item.id)
  }
  const handleRemove = () => {
    onRemove(item.id, item.name)
  }
  const handleChangeUserVariable = (key: string, value: string) => {
    setUserVariablesValue({
      ...userVariablesValue,
      [key]: value,
    })
  }
  const handleSaveUserVariables = () => {
    onSaveUserVariables(item.id, userVariablesValue)
  }

  return (
    <View style={{ ...styles.listItem, backgroundColor: activeId == item.id ? theme['c-primary-background-active'] : 'transparent' }}>
      <View style={styles.listItemLeft}>
        <Text size={14}>
          {item.name}
          {
            item.version ? (
              <Text size={12} color={theme['c-font-label']}>{ '   ' + formatVersionName(item.version) }</Text>
            ) : null
          }
          {
            item.author ? (
              <Text size={12} color={theme['c-font-label']}>{ '   ' + item.author }</Text>
            ) : null
          }
        </Text>
        {
          item.description ? (
            <Text size={12} color={theme['c-font-label']}>{item.description}</Text>
          ) : null
        }
        <CheckBox check={item.allowShowUpdateAlert} label={t('user_api_allow_show_update_alert')} onChange={changeAllowShowUpdateAlert} size={0.86} />
        {
          item.userVariables?.length
            ? (
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
                        style={{ ...styles.variableInput, borderColor: theme['c-border-background'] }}
                        onChangeText={(value) => { handleChangeUserVariable(variable.key, value) }}
                      />
                    </View>
                  ))
                }
                <TouchableOpacity style={styles.variableSaveBtn} onPress={handleSaveUserVariables}>
                  <Text size={12} color={theme['c-primary-font']}>Save</Text>
                </TouchableOpacity>
              </View>
            )
            : null
        }
      </View>
      <View style={styles.listItemRight}>
        <TouchableOpacity style={styles.btn} onPress={handleActive} disabled={activeId == item.id}>
          <Text size={12} color={theme['c-button-font']}>{activeId == item.id ? 'Active' : 'Enable'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleRemove}>
          <Icon name="close" color={theme['c-button-font']} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export interface UserApiEditModalProps {
  onSave: (rules: string) => void
  // onSourceChange: SourceSelectorProps['onSourceChange']
}
export interface UserApiEditModalType {
  show: (rules: string) => void
}


export default () => {
  const userApiList = useUserApiList()
  const apiSource = useSettingValue('common.apiSource')
  const theme = useTheme()
  const t = useI18n()

  const handleRemove = useCallback(async(id: string, name: string) => {
    const confirm = await confirmDialog({
      message: global.i18n.t('user_api_remove_tip', { name }),
      cancelButtonText: global.i18n.t('cancel_button_text_2'),
      confirmButtonText: global.i18n.t('confirm_button_text'),
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
  const handleChangeAllowShowUpdateAlert = useCallback((id: string, enabled: boolean) => {
    void setUserApiAllowShowUpdateAlert(id, enabled)
  }, [])
  const handleSaveUserVariables = useCallback((id: string, values: Record<string, string>) => {
    void setUserApiUserVariables(id, values)
  }, [])
  const handleActive = useCallback((id: string) => {
    setApiSource(id)
  }, [])

  return (
    <ScrollView style={styles.scrollView} keyboardShouldPersistTaps={'always'}>
      <View onStartShouldSetResponder={() => true}>
        {
          userApiList.length
            ? userApiList.map((item) => {
              return (
              <ListItem
                key={item.id}
                item={item}
                activeId={apiSource}
                onActive={handleActive}
                onRemove={handleRemove}
                onChangeAllowShowUpdateAlert={handleChangeAllowShowUpdateAlert}
                onSaveUserVariables={handleSaveUserVariables}
              />
              )
            })
            : <Text style={styles.tipText} color={theme['c-font-label']}>{t('user_api_empty')}</Text>
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
  list: {
    paddingBottom: 15,
    flexDirection: 'column',
  },
  listItem: {
    padding: 10,
    borderRadius: BorderRadius.normal,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  listItemLeft: {
    paddingRight: 10,
    flex: 1,
    gap: 2,
  },
  listItemRight: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  // btns: {
  //   padding: 5,
  // },
  btn: {
    padding: 10,
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  variableBlock: {
    marginTop: 4,
    gap: 5,
  },
  variableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  variableLabel: {
    width: 76,
  },
  variableInput: {
    height: 30,
    borderWidth: 1,
    borderRadius: BorderRadius.normal,
    paddingLeft: 8,
    paddingRight: 4,
  },
  variableSaveBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tipText: {
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 15,
  },
})
