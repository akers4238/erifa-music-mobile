import { eapiRequest as enhancedEapiRequest } from './api-enhanced'

export const eapiRequest = (url, data) => {
  return enhancedEapiRequest(url, data)
}
