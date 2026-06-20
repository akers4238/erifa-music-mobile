// Support qualitys: 128k 320k flac wav

const sources: Array<{
  id: string
  name: string
  disabled: boolean
  supportQualitys: Partial<Record<LX.OnlineSource, LX.Quality[]>>
}> = [
  {
    id: 'is_plus',
    name: 'is-plus',
    disabled: false,
    supportQualitys: {
      wy: ['128k', '320k', 'flac', 'flac24bit'],
      bilibili: ['128k'],
    },
  },
]

export default sources
