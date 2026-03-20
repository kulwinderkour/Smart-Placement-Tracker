import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Button from '../common/Button'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="font-bold text-gray-900 text-lg">PlacementTracker</span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/jobs" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Jobs</Link>
                {user?.role === 'student' && (
                  <>
                    <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Dashboard</Link>
                    <Link to="/tracker" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Tracker</Link>
                  </>
                )}
                {user?.role === 'admin' && (
                  <Link to="/admin" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Admin</Link>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{user?.email}</span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
                <Link to="/register"><Button size="sm">Sign Up</Button></Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
