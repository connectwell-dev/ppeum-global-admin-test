import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Loading } from './ui'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (!isAuthenticated)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <>{children}</>
}
