export type SearchType = 'music' | 'songlist'

export interface InitState {
  temp_source: string
  searchType: SearchType
  searchText: string
  tipListInfo: {
    text: string
    source: string
    list: string[]
  }
  historyList: string[]
}

const state: InitState = {
  temp_source: '',
  searchType: 'music',
  searchText: '',
  tipListInfo: {
    text: '',
    source: '',
    list: [],
  },
  historyList: [],
}


export default state
