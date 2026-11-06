import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// "Back" that works on a page opened straight from a link or notification:
// with no earlier in-app page, navigate(-1) would do nothing (or leave the
// app), so go to the fallback instead.
export default function useGoBack(fallback = '/') {
  const navigate = useNavigate()
  return useCallback(() => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}
