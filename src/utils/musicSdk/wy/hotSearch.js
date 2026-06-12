import { weapiRequest } from './utils/api-enhanced'

export default {
  _requestObj: null,
  async getList(retryNum = 0) {
    if (this._requestObj) this._requestObj.cancelHttp()
    if (retryNum > 2) return Promise.reject(new Error('try max num'))

    const _requestObj = weapiRequest('/api/hotsearchlist/get', {})
    const { body, statusCode } = await _requestObj.promise
    if (statusCode != 200 || body.code !== 200) throw new Error('获取热搜词失败')

    return { source: 'wy', list: this.filterList(body.data) }
  },
  filterList(rawList) {
    return rawList.map(item => item.searchWord)
  },
}
