import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ImageItem, Paginated, ImageRef } from '../lib/types'
import { Modal, Empty, Spinner, Pagination } from './ui'
import { imageUrl } from '../lib/image'

interface Props {
  value: ImageRef | null
  onChange: (image: ImageRef | null) => void
  label?: string
}

// imageCode 선택 컴포넌트: 현재 이미지를 보여주고, 모달에서 이미지 목록을 골라 교체
export default function ImagePicker({ value, onChange, label = '이미지' }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface-2)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {value ? (
            <img
              src={imageUrl(value.path)}
              alt={value.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span className="hint">없음</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{value?.name || '선택된 이미지 없음'}</div>
          <div className="hint">{value?.code || ''}</div>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
          선택
        </button>
        {value && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(null)}>
            해제
          </button>
        )}
      </div>
      {open && (
        <PickerModal
          onClose={() => setOpen(false)}
          onPick={(img) => {
            onChange({ code: img.code, name: img.name, path: img.path })
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

function PickerModal({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (img: ImageItem) => void
}) {
  const [items, setItems] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPage, setTotalPage] = useState(1)
  const [keyword, setKeyword] = useState('')

  const load = async (p: number, name?: string) => {
    setLoading(true)
    try {
      const res = await api.get<Paginated<ImageItem>>('/api/v1/general/image/list', {
        page: p,
        rowCount: 12,
        name: name || undefined,
      })
      setItems(res.data)
      setTotal(res.total)
      setTotalPage(res.totalPage)
      setPage(res.page)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  return (
    <Modal title="이미지 선택" onClose={onClose} size="lg">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <div className="field" style={{ flex: 1 }}>
          <input
            placeholder="이미지명 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1, keyword)}
          />
        </div>
        <button className="btn" onClick={() => load(1, keyword)}>
          검색
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <Empty message="이미지가 없습니다." />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 10,
          }}
        >
          {items.map((img) => (
            <div
              key={img.code}
              className="card clickable"
              onClick={() => onPick(img)}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  height: 90,
                  background: 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {img.path && (
                  <img
                    src={imageUrl(img.path)}
                    alt={img.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
              <div style={{ padding: '6px 8px', fontSize: 12.5, fontWeight: 600 }}>
                {img.name}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        totalPage={totalPage}
        total={total}
        onChange={(p) => load(p, keyword)}
      />
    </Modal>
  )
}
