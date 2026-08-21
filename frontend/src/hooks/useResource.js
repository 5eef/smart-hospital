import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resourceService } from '../services/resourceService'

export function useResource(resource, params = {}, fallback = []) {
  const paramsKey = JSON.stringify(params)
  const stableParams = useMemo(() => JSON.parse(paramsKey), [paramsKey])
  const fallbackRef = useRef(fallback)
  const [items, setItems] = useState(fallback)
  const [pagination, setPagination] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await resourceService.list(resource, stableParams)
      setItems(data.data ?? data)
      setPagination(data.current_page ? { currentPage: data.current_page, lastPage: data.last_page, total: data.total, perPage: data.per_page } : null)
      return data
    } catch (requestError) {
      setError(requestError)
      setItems(fallbackRef.current)
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }, [resource, stableParams])

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const data = await resourceService.list(resource, stableParams)
        if (!isMounted) return
        setItems(data.data ?? data)
        setPagination(data.current_page ? { currentPage: data.current_page, lastPage: data.last_page, total: data.total, perPage: data.per_page } : null)
        setError(null)
      } catch (requestError) {
        if (!isMounted) return
        setError(requestError)
        setItems(fallbackRef.current)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [resource, stableParams])

  return { items, pagination, isLoading, error, refetch: fetchItems }
}
