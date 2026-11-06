import { Component } from 'react'
import { LogoMark } from './Logo'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-center">
          <LogoMark className="w-16 h-16 rounded-2xl mb-6" alt="" />

          <h1 className="text-2xl font-bold text-navy mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-6">Please refresh the page to continue.</p>

          <button
            onClick={() => window.location.reload()}
            className="bg-navy text-white px-6 py-2.5 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
          >
            Refresh page
          </button>

          {import.meta.env.DEV && this.state.error && (
            <details className="mt-8 text-left max-w-lg">
              <summary className="text-sm text-gray-500 cursor-pointer">Error details (dev only)</summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
