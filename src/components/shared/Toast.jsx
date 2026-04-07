import { toast as hotToast, Toaster as HotToaster } from 'react-hot-toast'

const baseStyle = {
  borderRadius: '10px',
  fontFamily: 'inherit',
  fontSize: '14px',
  maxWidth: '380px',
}

export const toast = {
  success: (message) =>
    hotToast.success(message, {
      duration: 4000,
      style: { ...baseStyle, background: '#fff', color: '#1B2A4A', border: '1px solid #C9A84C' },
      iconTheme: { primary: '#C9A84C', secondary: '#fff' },
    }),

  error: (message) =>
    hotToast.error(message, {
      duration: 6000,
      style: { ...baseStyle, background: '#fff', color: '#1B2A4A', border: '1px solid #ef4444' },
      iconTheme: { primary: '#ef4444', secondary: '#fff' },
    }),

  info: (message) =>
    hotToast(message, {
      duration: 4000,
      icon: 'ℹ️',
      style: { ...baseStyle, background: '#1B2A4A', color: '#fff' },
    }),

  offline: () =>
    hotToast('You are offline. Changes will sync when you reconnect.', {
      id: 'offline',
      duration: Infinity,
      icon: '📡',
      style: { ...baseStyle, background: '#6b7280', color: '#fff' },
    }),

  online: () => {
    hotToast.dismiss('offline')
    hotToast.success('You are back online.', {
      duration: 3000,
      style: { ...baseStyle, background: '#fff', color: '#1B2A4A', border: '1px solid #C9A84C' },
      iconTheme: { primary: '#C9A84C', secondary: '#fff' },
    })
  },
}

export function Toaster() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  return (
    <HotToaster
      position={isMobile ? 'top-center' : 'bottom-right'}
      toastOptions={{ style: baseStyle }}
      containerStyle={{ zIndex: 9999 }}
      gutter={8}
    />
  )
}
