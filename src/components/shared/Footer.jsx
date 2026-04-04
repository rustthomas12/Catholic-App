import { Link } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="hidden md:block text-center py-6 text-sm text-gray-400">
      <div className="flex items-center justify-center gap-1 mb-2">
        <span className="font-medium text-gray-500">Parish</span>
        <svg viewBox="0 0 24 24" className="w-3 h-4 fill-gold">
          <path d="M10.5 3h3v6h4.5v3H13.5v11h-3V12H6V9h4.5z" />
        </svg>
      </div>
      <div className="flex items-center justify-center gap-3 mb-2">
        <Link to="/terms" className="hover:text-navy transition-colors">Terms of Service</Link>
        <span>|</span>
        <Link to="/privacy" className="hover:text-navy transition-colors">Privacy Policy</Link>
        <span>|</span>
        <Link to="/policy" className="hover:text-navy transition-colors">Content Policy</Link>
      </div>
      <p>Made with faith in Massachusetts &copy; {year}</p>
    </footer>
  )
}
