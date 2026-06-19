import { useImperativeHandle, forwardRef, useRef, useState } from 'react'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import UserApiManager from './UserApiManager'

export interface UserApiEditModalType {
  show: () => void
}

export default forwardRef<UserApiEditModalType, {}>((props, ref) => {
  const dialogRef = useRef<DialogType>(null)
  const [visible, setVisible] = useState(false)

  const handleShow = () => {
    dialogRef.current?.setVisible(true)
  }

  useImperativeHandle(ref, () => ({
    show() {
      if (visible) handleShow()
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          handleShow()
        })
      }
    },
  }))

  const handleCancel = () => {
    dialogRef.current?.setVisible(false)
  }

  return visible
    ? (
        <Dialog ref={dialogRef} bgHide={false}>
          <UserApiManager onClose={handleCancel} />
        </Dialog>
      )
    : null
})
