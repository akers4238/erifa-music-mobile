import { dateFormat2 } from '../../index'
import { eapiRequest } from './utils/index'

const buildSongThreadId = songmid => 'R_SO_4_' + songmid

export default {
  _requestObj: null,
  _requestObj2: null,

  async getComment({ songmid }, page = 1, limit = 20) {
    if (this._requestObj) this._requestObj.cancelHttp()

    this._requestObj = eapiRequest('/api/v2/resource/comments', {
      threadId: buildSongThreadId(songmid),
      pageNo: page,
      showInner: true,
      pageSize: limit,
      cursor: page == 1 ? 0 : (page - 1) * limit,
      sortType: 3,
    })

    const { body, statusCode } = await this._requestObj.promise
    if (statusCode != 200 || body.code !== 200) throw new Error('获取评论失败')
    const total = body.data?.totalCount ?? 0
    return {
      source: 'wy',
      comments: this.filterComment(body.data?.comments ?? []),
      total,
      page,
      limit,
      maxPage: Math.ceil(total / limit) || 1,
    }
  },

  async getHotComment({ songmid }, page = 1, limit = 100) {
    if (this._requestObj2) this._requestObj2.cancelHttp()

    this._requestObj2 = eapiRequest('/api/v2/resource/comments', {
      threadId: buildSongThreadId(songmid),
      pageNo: page,
      showInner: true,
      pageSize: limit,
      cursor: 'normalHot#' + limit * (page - 1),
      sortType: 2,
    })

    const { body, statusCode } = await this._requestObj2.promise
    if (statusCode != 200 || body.code !== 200) throw new Error('获取热门评论失败')
    const total = body.data?.totalCount ?? 0
    return {
      source: 'wy',
      comments: this.filterComment(body.data?.comments ?? []),
      total,
      page,
      limit,
      maxPage: Math.ceil(total / limit) || 1,
    }
  },

  filterComment(rawList) {
    return rawList.map(item => {
      const data = {
        id: item.commentId,
        text: item.content || '',
        time: item.time || '',
        timeStr: item.time ? dateFormat2(item.time) : '',
        location: item.ipLocation?.location,
        userName: item.user?.nickname || '',
        avatar: item.user?.avatarUrl,
        userId: item.user?.userId,
        likedCount: item.likedCount,
        reply: [],
      }

      const replyData = item.beReplied && item.beReplied[0]
      return replyData
        ? {
            id: item.commentId,
            rootId: replyData.beRepliedCommentId,
            text: replyData.content || '',
            time: item.time,
            timeStr: null,
            location: replyData.ipLocation?.location,
            userName: replyData.user?.nickname || '',
            avatar: replyData.user?.avatarUrl,
            userId: replyData.user?.userId,
            likedCount: null,
            reply: [data],
          }
        : data
    })
  },
}
