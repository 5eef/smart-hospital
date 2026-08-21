import { useCallback, useState } from 'react'

export function useActionNotice() {
  const [message, setMessage] = useState('')

  const notify = useCallback((nextMessage) => {
    setMessage(nextMessage)
  }, [])

  const clear = useCallback(() => {
    setMessage('')
  }, [])

  return { message, notify, clear }
}
