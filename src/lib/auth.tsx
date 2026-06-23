import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api, tokenStore } from './api'
import type { LoginData, MeData, Platform } from './types'

interface AuthContextValue {
  me: MeData | null
  platform: Platform
  loading: boolean
  isAuthenticated: boolean
  login: (platform: Platform, id: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeData | null>(null)
  const [loading, setLoading] = useState(true)
  const platform = tokenStore.platform

  const fetchMe = async () => {
    const data = await api.get<MeData>(`/api/v1/auth/${tokenStore.platform}/me`)
    setMe(data)
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!tokenStore.access) {
        setLoading(false)
        return
      }
      try {
        const data = await api.get<MeData>(`/api/v1/auth/${tokenStore.platform}/me`)
        if (alive) setMe(data)
      } catch {
        tokenStore.clear()
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const login: AuthContextValue['login'] = async (plat, id, password) => {
    const data = await api.login<LoginData>(plat, { id, password })
    tokenStore.set(data.accessToken, data.refreshToken, plat)
    await fetchMe()
  }

  const logout: AuthContextValue['logout'] = async () => {
    try {
      await api.logout(tokenStore.platform)
    } catch {
      // 서버 로그아웃 실패해도 로컬 토큰은 제거
    }
    tokenStore.clear()
    setMe(null)
  }

  const value: AuthContextValue = {
    me,
    platform,
    loading,
    isAuthenticated: !!me,
    login,
    logout,
    refreshMe: fetchMe,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
