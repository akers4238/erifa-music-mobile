// https://github.com/Binaryify/NeteaseCloudMusicApi/blob/master/module/song_detail.js
import { eapiRequest } from './utils/index'

export default songmid => {
  const requestObj = eapiRequest('/api/v3/song/detail', {
    c: `[{"id":${songmid}}]`,
    ids: `[${songmid}]`,
  })
  requestObj.promise = requestObj.promise.then(({ body }) => {
    // console.log(body)
    if (body.code !== 200 || !body.songs.length) return Promise.reject(new Error('获取歌曲信息失败'))
    return body.songs[0]
  })
  return requestObj
}
