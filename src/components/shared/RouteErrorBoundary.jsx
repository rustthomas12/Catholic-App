import { Component } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Route error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <ExclamationTriangleIcon className="w-10 h-10 text-gold mb-4" />
          <p className="text-lg font-semibold text-navy mb-1">Something went wrong</p>
          <p className="text-sm text-gray-500 mb-5">This page encountered an error.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-white border border-gray-200 text-navy text-sm font-semibold px-4 py-2.5 rounded-xl min-h-[44px] hover:bg-lightbg transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
