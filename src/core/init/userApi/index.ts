import { setUserApiList, setUserApiStatus } from '@/core/userApi'
import { getUserApiList } from '@/utils/data'

export default async(_setting: LX.AppSetting) => {
  const list = await getUserApiList()
  setUserApiList(list)
  setUserApiStatus(false, undefined)
}
