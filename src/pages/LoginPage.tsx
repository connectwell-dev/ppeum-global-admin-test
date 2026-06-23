import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ApiError } from '../lib/api'
import type { Platform } from '../lib/types'
import { Spinner } from '../components/ui'

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/'

  const [platform, setPlatform] = useState<Platform>('admin')
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAuthenticated) return <Navigate to={from} replace />

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(platform, id.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : '로그인에 실패했습니다. 다시 시도해주세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>PPEUM Global</h1>
        <p className="sub">관리자 콘솔에 로그인하세요.</p>
        <form className="login-form" onSubmit={onSubmit}>
          <div className="seg">
            <button
              type="button"
              className={platform === 'admin' ? 'active' : ''}
              onClick={() => setPlatform('admin')}
            >
              어드민
            </button>
            <button
              type="button"
              className={platform === 'user' ? 'active' : ''}
              onClick={() => setPlatform('user')}
            >
              유저
            </button>
          </div>
          <div className="field">
            <label>아이디</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="로그인 아이디"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={submitting || !id || !password}
          >
            {submitting ? <Spinner /> : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}
