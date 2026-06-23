import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/lang'
import { LANGUAGES } from '../lib/constants'
import type { Language } from '../lib/types'

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: '대시보드',
    items: [{ to: '/', label: '홈', icon: '🏠', end: true }],
  },
  {
    section: '상품 관리',
    items: [
      { to: '/products', label: '상품', icon: '📦' },
      { to: '/product-groups', label: '상품 그룹', icon: '📋' },
      { to: '/categories', label: '카테고리', icon: '🎉' },
    ],
  },
  {
    section: '콘텐츠',
    items: [
      { to: '/product-detail-info', label: '상세페이지 설정', icon: '💉' },
      { to: '/images', label: '이미지', icon: '🖼️' },
    ],
  },
  {
    section: '설정',
    items: [
      { to: '/policy', label: '약관 설정', icon: '📄' },
      { to: '/basic-popup', label: '기본 팝업', icon: '🪟' },
      { to: '/hospital-work-time', label: '병원 예약 설정', icon: '🏥' },
    ],
  },
]

const TITLES: Record<string, string> = {
  '/': '대시보드',
  '/products': '상품 관리',
  '/product-groups': '상품 그룹',
  '/categories': '카테고리',
  '/product-detail-info': '상세페이지 설정',
  '/images': '이미지',
  '/policy': '약관 설정',
  '/basic-popup': '기본 팝업',
  '/hospital-work-time': '병원 예약 설정',
}

export default function Layout() {
  const { me, logout, platform } = useAuth()
  const { lang, setLang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const title =
    Object.entries(TITLES)
      .filter(([p]) => p !== '/' && location.pathname.startsWith(p))
      .map(([, t]) => t)[0] || TITLES[location.pathname] || '관리자'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          PPEUM Global
          <small>관리자 콘솔</small>
        </div>
        <nav className="sidebar-nav" onClick={() => setOpen(false)}>
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="nav-section">{group.section}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="nav-ico">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-sm only-mobile" onClick={() => setOpen((v) => !v)}>
            ☰
          </button>
          <div className="topbar-title">{title}</div>
          <div className="topbar-spacer" />
          <div className="topbar-lang">
            <label>표시 언어</label>
            <select value={lang} onChange={(e) => setLang(e.target.value as Language)}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="topbar-user">
            <div className="who">
              <b>{me?.name ?? '사용자'}</b>
              <span>
                {platform === 'admin' ? '어드민' : '유저'} · {me?.loginId}
              </span>
            </div>
            <button className="btn btn-sm" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
