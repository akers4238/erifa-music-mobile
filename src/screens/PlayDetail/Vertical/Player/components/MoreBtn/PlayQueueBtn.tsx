import { useRef } from 'react'

import PlayQueueModal, { type PlayQueueModalType } from '@/screens/PlayDetail/components/PlayQueueModal'
import Btn from './Btn'

export default () => {
  const modalRef = useRef<PlayQueueModalType>(null)

  return (
    <>
      <Btn icon="menu" onPress={() => { modalRef.current?.show() }} />
      <PlayQueueModal ref={modalRef} />
    </>
  )
}
