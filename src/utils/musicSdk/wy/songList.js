import { httpFetch } from '../../request'
import { formatPlayTime, sizeFormate, dateFormat, formatPlayCount } from '../../index'
import musicDetailApi from './musicDetail'
import { eapiRequest } from './utils/index'
import { weapiRequest } from './utils/api-enhanced'
import { formatSingerName } from '../utils'

export default {
  _requestObj_tags: null,
  _requestObj_hotTags: null,
  _requestObj_list: null,
  limit_list: 30,
  limit_song: 100000,
  successCode: 200,
  cookie: 'MUSIC_U=',
  sortList: [
    {
      name: 'My Playlists',
      tid: 'my',
      id: 'my',
    },
    {
      name: '最热',
      tid: 'hot',
      id: 'hot',
    },
  ],
  regExps: {
    listDetailLink: /^.+(?:\?|&)id=(\d+)(?:&.*$|#.*$|$)/,
    listDetailLink2: /^.+\/playlist\/(\d+)\/\d+\/.+$/,
  },

  async handleParseId(link, retryNum = 0) {
    if (retryNum > 2) throw new Error('link try max num')

    const requestObj_listDetailLink = httpFetch(link)
    const { url, statusCode } = await requestObj_listDetailLink.promise
    if (statusCode > 400) return this.handleParseId(link, ++retryNum)
    return this.regExps.listDetailLink.test(url)
      ? url.replace(this.regExps.listDetailLink, '$1')
      : url.replace(this.regExps.listDetailLink2, '$1')
  },

  async getListId(id) {
    let cookie
    if (/###/.test(id)) {
      const [url, token] = id.split('###')
      id = url
      cookie = `MUSIC_U=${token}`
    }
    if ((/[?&:/]/.test(id))) {
      if (this.regExps.listDetailLink.test(id)) {
        id = id.replace(this.regExps.listDetailLink, '$1')
      } else if (this.regExps.listDetailLink2.test(id)) {
        id = id.replace(this.regExps.listDetailLink2, '$1')
      } else {
        id = await this.handleParseId(id)
      }
    }
    return { id, cookie }
  },

  async getListDetail(rawId, page, tryNum = 0) {
    if (tryNum > 2) return Promise.reject(new Error('try max num'))

    const { id, cookie } = await this.getListId(rawId)
    if (cookie) this.cookie = cookie

    const requestObj_listDetail = eapiRequest('/api/v6/playlist/detail', {
      id,
      n: this.limit_song,
      s: 8,
    })
    const { statusCode, body } = await requestObj_listDetail.promise
    if (statusCode !== 200 || body.code !== this.successCode) return this.getListDetail(id, page, ++tryNum)

    const limit = 1000
    const rangeStart = (page - 1) * limit
    let list
    if (body.playlist.trackIds.length == body.privileges.length) {
      list = this.filterListDetail(body)
    } else {
      try {
        list = (await musicDetailApi.getList(body.playlist.trackIds.slice(rangeStart, limit * page).map(trackId => trackId.id))).list
      } catch (err) {
        console.log(err)
        if (err.message == 'try max num') {
          throw err
        }
        return this.getListDetail(id, page, ++tryNum)
      }
    }

    return {
      list,
      page,
      limit,
      total: body.playlist.trackIds.length,
      source: 'wy',
      info: {
        play_count: formatPlayCount(body.playlist.playCount),
        name: body.playlist.name,
        img: body.playlist.coverImgUrl,
        desc: body.playlist.description,
        author: body.playlist.creator.nickname,
      },
    }
  },

  filterListDetail({ playlist: { tracks }, privileges }) {
    const list = []
    tracks.forEach((item, index) => {
      const types = []
      const _types = {}
      let size
      let privilege = privileges[index]
      if (privilege.id !== item.id) privilege = privileges.find(p => p.id === item.id)
      if (!privilege) return

      if (privilege.maxBrLevel == 'hires') {
        size = item.hr ? sizeFormate(item.hr.size) : null
        types.push({ type: 'flac24bit', size })
        _types.flac24bit = {
          size,
        }
      }
      switch (privilege.maxbr) {
        case 999000:
          size = null
          types.push({ type: 'flac', size })
          _types.flac = {
            size,
          }
        case 320000:
          size = item.h ? sizeFormate(item.h.size) : null
          types.push({ type: '320k', size })
          _types['320k'] = {
            size,
          }
        case 192000:
        case 128000:
          size = item.l ? sizeFormate(item.l.size) : null
          types.push({ type: '128k', size })
          _types['128k'] = {
            size,
          }
      }

      types.reverse()

      if (item.pc) {
        list.push({
          singer: item.pc.ar ?? '',
          name: item.pc.sn ?? '',
          albumName: item.pc.alb ?? '',
          albumId: item.al?.id,
          source: 'wy',
          interval: formatPlayTime(item.dt / 1000),
          songmid: item.id,
          img: item.al?.picUrl ?? '',
          lrc: null,
          otherSource: null,
          types,
          _types,
          typeUrl: {},
        })
      } else {
        list.push({
          singer: formatSingerName(item.ar, 'name'),
          name: item.name ?? '',
          albumName: item.al?.name,
          albumId: item.al?.id,
          source: 'wy',
          interval: formatPlayTime(item.dt / 1000),
          songmid: item.id,
          img: item.al?.picUrl,
          lrc: null,
          otherSource: null,
          types,
          _types,
          typeUrl: {},
        })
      }
    })
    return list
  },

  getList(sortId, tagId, page, tryNum = 0) {
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    if (sortId == 'my') return this.getMyList(page, tryNum)
    if (this._requestObj_list) this._requestObj_list.cancelHttp()
    this._requestObj_list = weapiRequest('/api/playlist/list', {
      cat: tagId || '全部',
      order: sortId,
      limit: this.limit_list,
      offset: this.limit_list * (page - 1),
      total: true,
    })
    return this._requestObj_list.promise.then(({ body }) => {
      if (body.code !== this.successCode) return this.getList(sortId, tagId, page, ++tryNum)
      return {
        list: this.filterList(body.playlists),
        total: parseInt(body.total),
        page,
        limit: this.limit_list,
        source: 'wy',
      }
    })
  },

  filterList(rawData) {
    return rawData.map(item => ({
      play_count: formatPlayCount(item.playCount),
      id: String(item.id),
      author: item.creator?.nickname || item.creatorName || '',
      name: item.name,
      time: item.createTime ? dateFormat(item.createTime, 'Y-M-D') : '',
      img: item.coverImgUrl,
      grade: item.grade,
      total: item.trackCount,
      desc: item.description,
      source: 'wy',
    }))
  },

  async getAccountProfile() {
    const { body } = await weapiRequest('/api/nuser/account/get', {}).promise
    const userId = body?.profile?.userId || body?.account?.id
    if (body?.code !== this.successCode || !userId) throw new Error('Please login NetEase first')
    return body.profile || { userId }
  },

  async getMyList(page, tryNum = 0) {
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    if (this._requestObj_list) this._requestObj_list.cancelHttp()

    const profile = await this.getAccountProfile()
    this._requestObj_list = weapiRequest('/api/user/playlist', {
      uid: profile.userId,
      limit: this.limit_list,
      offset: this.limit_list * (page - 1),
      includeVideoPlaylist: true,
    })
    return this._requestObj_list.promise.then(({ body }) => {
      if (body.code !== this.successCode) return this.getMyList(page, ++tryNum)
      return {
        list: this.filterList(body.playlist || []),
        total: parseInt(body.more ? this.limit_list * (page + 1) : (body.playlist || []).length + this.limit_list * (page - 1)),
        page,
        limit: this.limit_list,
        source: 'wy',
      }
    })
  },

  async createPlaylist(name, tryNum = 0) {
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    const { body } = await weapiRequest('/api/playlist/create', {
      name,
      privacy: 0,
      type: 'NORMAL',
    }).promise
    if (body.code !== this.successCode) {
      if (body.message || body.msg) throw new Error(body.message || body.msg)
      return this.createPlaylist(name, ++tryNum)
    }
    return body.playlist
  },

  getTag(tryNum = 0) {
    if (this._requestObj_tags) this._requestObj_tags.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    this._requestObj_tags = weapiRequest('/api/playlist/catalogue', {})
    return this._requestObj_tags.promise.then(({ body }) => {
      if (body.code !== this.successCode) return this.getTag(++tryNum)
      return this.filterTagInfo(body)
    })
  },

  filterTagInfo({ sub, categories }) {
    const subList = {}
    for (const item of sub) {
      if (!subList[item.category]) subList[item.category] = []
      subList[item.category].push({
        parent_id: categories[item.category],
        parent_name: categories[item.category],
        id: item.name,
        name: item.name,
        source: 'wy',
      })
    }

    const list = []
    for (const key of Object.keys(categories)) {
      list.push({
        name: categories[key],
        list: subList[key],
        source: 'wy',
      })
    }
    return list
  },

  getHotTag(tryNum = 0) {
    if (this._requestObj_hotTags) this._requestObj_hotTags.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    this._requestObj_hotTags = weapiRequest('/api/playlist/hottags', {})
    return this._requestObj_hotTags.promise.then(({ body }) => {
      if (body.code !== this.successCode) return this.getTag(++tryNum)
      return this.filterHotTagInfo(body.tags)
    })
  },

  filterHotTagInfo(rawList) {
    return rawList.map(item => ({
      id: item.playlistTag.name,
      name: item.playlistTag.name,
      source: 'wy',
    }))
  },

  getTags() {
    return Promise.all([this.getTag(), this.getHotTag()]).then(([tags, hotTag]) => ({ tags, hotTag, source: 'wy' }))
  },

  async getDetailPageUrl(rawId) {
    const { id } = await this.getListId(rawId)
    return `https://music.163.com/#/playlist?id=${id}`
  },

  search(text, page, limit = 20) {
    return eapiRequest('/api/cloudsearch/pc', {
      s: text,
      type: 1000,
      limit,
      total: page == 1,
      offset: limit * (page - 1),
    })
      .promise.then(({ body }) => {
        if (body.code != this.successCode) throw new Error('failed')
        return {
          list: this.filterList(body.result.playlists),
          limit,
          total: body.result.playlistCount,
          source: 'wy',
        }
      })
  },
}
