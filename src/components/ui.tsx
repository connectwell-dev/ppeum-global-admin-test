import {
  useEffect,
  type ReactNode,
} from 'react'
import { langLabel } from '../lib/constants'
import type { Language } from '../lib/types'

export function Spinner() {
  return <span className="spinner" />
}

export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div className="center-screen">
      <Spinner /> {label}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  size,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'lg'
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal${size === 'lg' ? ' lg' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'badge-green' : 'badge-gray'}`}>
      {active ? '사용' : '미사용'}
    </span>
  )
}

export function NotInputLangs({ langs }: { langs: Language[] }) {
  if (!langs || langs.length === 0)
    return <span className="badge badge-green">완료</span>
  return (
    <span className="badge-row">
      {langs.map((l) => (
        <span key={l} className="badge badge-amber" title="미입력 언어">
          {langLabel(l)}
        </span>
      ))}
    </span>
  )
}

export function Pagination({
  page,
  totalPage,
  total,
  onChange,
}: {
  page: number
  totalPage: number
  total: number
  onChange: (p: number) => void
}) {
  if (totalPage <= 1)
    return <div className="pagination"><span className="info">총 {total}건</span></div>

  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPage, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="pagination">
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`btn btn-sm${p === page ? ' btn-primary' : ''}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="btn btn-sm"
        disabled={page >= totalPage}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
      <span className="info">총 {total}건</span>
    </div>
  )
}

export function Empty({ message = '데이터가 없습니다.' }: { message?: string }) {
  return <div className="empty">{message}</div>
}

// 문자열 배열 입력 (해시태그, 주의사항 등)
export function ChipsInput({
  value,
  onChange,
  placeholder,
  errorIndexes,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  errorIndexes?: Set<number>
}) {
  const add = (text: string) => {
    const t = text.trim()
    if (t && !value.includes(t)) onChange([...value, t])
  }
  return (
    <div>
      <div className="chips" style={{ marginBottom: value.length ? 8 : 0 }}>
        {value.map((v, i) => (
          <span key={`${v}-${i}`} className={`chip${errorIndexes?.has(i) ? ' chip-error' : ''}`}>
            {v}
            <button onClick={() => onChange(value.filter((_, idx) => idx !== i))}>×</button>
          </span>
        ))}
      </div>
      <input
        placeholder={placeholder || '입력 후 Enter'}
        onKeyDown={(e) => {
          // 한글 등 IME 조합 중에 발생하는 Enter(조합 확정용)는 무시한다.
          // 무시하지 않으면 조합 중이던 마지막 글자가 한 번 더 등록되는 문제가 생긴다.
          if (e.nativeEvent.isComposing || e.key === 'Process' || e.keyCode === 229) return
          if (e.key === 'Enter') {
            e.preventDefault()
            add((e.target as HTMLInputElement).value)
            ;(e.target as HTMLInputElement).value = ''
          }
        }}
      />
    </div>
  )
}

// key-value 목록 편집 (shortDescription)
// lockedKeys 에 포함된 항목명은 고정 항목으로 간주해 항목명 수정/삭제를 막는다.
export function KeyValueEditor({
  value,
  onChange,
  lockedKeys = [],
  valuePlaceholder = '값',
  errorCells,
}: {
  value: { key: string; value: string }[]
  onChange: (v: { key: string; value: string }[]) => void
  lockedKeys?: string[]
  valuePlaceholder?: string
  errorCells?: Set<string>
}) {
  const isLocked = (key: string) => lockedKeys.includes(key)
  const update = (i: number, patch: Partial<{ key: string; value: string }>) =>
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {value.map((row, i) => {
        const locked = isLocked(row.key)
        return (
          <div className="kv-row" key={i}>
            <input
              className={errorCells?.has(`${i}.key`) ? 'input-error' : undefined}
              placeholder="항목"
              value={row.key}
              disabled={locked}
              title={locked ? '고정 항목입니다' : undefined}
              onChange={(e) => update(i, { key: e.target.value })}
            />
            <input
              className={errorCells?.has(`${i}.value`) ? 'input-error' : undefined}
              placeholder={valuePlaceholder}
              value={row.value}
              onChange={(e) => update(i, { value: e.target.value })}
            />
            {locked ? (
              <span className="btn btn-sm btn-ghost" style={{ visibility: 'hidden' }} aria-hidden>
                ×
              </span>
            ) : (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            )}
          </div>
        )
      })}
      <button
        className="btn btn-sm"
        type="button"
        onClick={() => onChange([...value, { key: '', value: '' }])}
      >
        + 항목 추가
      </button>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function confirmDelete(name: string): boolean {
  return window.confirm(`'${name}' 을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)
}
