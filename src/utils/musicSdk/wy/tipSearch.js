import { formatSingerName } from '../utils'
import { weapiRequest } from './utils/api-enhanced'

export default {
  requestObj: null,
  cancelTipSearch() {
    if (this.requestObj && this.requestObj.cancelHttp) this.requestObj.cancelHttp()
  },
  tipSearchBySong(str) {
    this.cancelTipSearch()
    this.requestObj = weapiRequest('/api/search/suggest/web', {
      s: str,
    })
    return this.requestObj.promise.then(({ statusCode, body }) => {
      if (statusCode != 200 || body.code != 200) return Promise.reject(new Error('请求失败'))
      return body.result.songs
    })
  },
  handleResult(rawData) {
    return rawData.map(info => `${info.name} - ${formatSingerName(info.artists, 'name')}`)
  },
  async search(str) {
    return this.tipSearchBySong(str).then(result => this.handleResult(result))
  },
}
