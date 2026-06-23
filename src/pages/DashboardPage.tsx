import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Paginated } from '../lib/types'
import { Spinner } from '../components/ui'

interface Stats {
  products: number
  events: number
  operationInfo: number
  images: number
}

const CARDS: { key: keyof Stats; label: string; icon: string; to: string }[] = [
  { key: 'products', label: '상품', icon: '📦', to: '/products' },
  { key: 'events', label: '이벤트', icon: '🎉', to: '/events' },
  { key: 'operationInfo', label: '시술 설명', icon: '💉', to: '/operation-info' },
  { key: 'images', label: '이미지', icon: '🖼️', to: '/images' },
]

export default function DashboardPage() {
  const { me, platform } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const totalOf = async (path: string) => {
        try {
          const r = await api.get<Paginated<unknown>>(path, { page: 1, rowCount: 1 })
          return r.total ?? 0
        } catch {
          return 0
        }
      }
      const [products, events, operationInfo, images] = await Promise.all([
        totalOf('/api/v1/product/list'),
        totalOf('/api/v1/product-event/list'),
        totalOf('/api/v1/operation-info/list'),
        totalOf('/api/v1/general/image/list'),
      ])
      setStats({ products, events, operationInfo, images })
      setLoading(false)
    })()
  }, [])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>안녕하세요, {me?.name ?? '관리자'}님 👋</h2>
          <div className="sub">
            {platform === 'admin' ? '어드민' : '유저'} 계정으로 로그인했습니다.
          </div>
        </div>
      </div>

      <div className="stat-grid">
        {CARDS.map((c) => (
          <div
            key={c.key}
            className="stat-card clickable"
            onClick={() => navigate(c.to)}
          >
            <div className="ico">{c.icon}</div>
            <div className="label">{c.label}</div>
            <div className="value">
              {loading ? <Spinner /> : (stats?.[c.key] ?? 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>다국어 운영 안내</h3>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          기준 언어와 공용 언어는 모두 <b>한국어(ko)</b> 입니다. 상품·이벤트·시술 설명은 한국어로
          먼저 등록한 뒤, 상세 화면의 언어 탭에서 기타 언어 번역을 입력하세요. 상단의{' '}
          <b>표시 언어</b>를 바꾸면 목록·상세가 해당 언어 기준으로 표시됩니다.
        </p>
      </div>
    </div>
  )
}
