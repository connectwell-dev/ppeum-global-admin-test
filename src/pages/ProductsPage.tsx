import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError, API_BASE_URL, tokenStore } from '../lib/api'
import { useToast } from '../lib/toast'
import { useLang } from '../lib/lang'
import type { Paginated, ProductListItem } from '../lib/types'
import {
  Empty,
  Loading,
  Pagination,
  StatusBadge,
  NotInputLangs,
  confirmDelete,
} from '../components/ui'

const ROW_COUNT = 10

const formatPeriod = (start: string | null, end: string | null) => {
  if (!start && !end) return '상시'
  return `${start || '~'} ~ ${end || '상시'}`
}

interface UploadError {
  row: number
  message: string
}

export default function ProductsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { lang } = useLang()

  const [items, setItems] = useState<ProductListItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPage, setTotalPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState('')

  const load = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await api.get<Paginated<ProductListItem>>('/api/v1/product/list', {
          page: p,
          rowCount: ROW_COUNT,
          name: name || undefined,
          isActive: isActive || undefined,
        })
        setItems(res.data)
        setTotal(res.total)
        setTotalPage(res.totalPage)
        setPage(res.page)
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '상품을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    },
    [name, isActive, toast],
  )

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const remove = async (item: ProductListItem) => {
    if (!confirmDelete(item.name || item.code)) return
    try {
      await api.del(`/api/v1/product/${item.id}`)
      toast.success('삭제되었습니다.')
      load(page)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '삭제에 실패했습니다.')
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<UploadError[] | null>(null)

  const downloadTemplate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/product/upload-template`, {
        headers: {
          Authorization: `Bearer ${tokenStore.access}`,
          lang: tokenStore.lang,
        },
      })
      if (!res.ok) throw new Error('다운로드 실패')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '상품_업로드_템플릿.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '다운로드에 실패했습니다.')
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE_URL}/api/v1/product/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenStore.access}`,
          lang: tokenStore.lang,
        },
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || '업로드 실패')
      }
      const data = json.data ?? json
      const errs = (data.errors ?? []) as UploadError[]
      if (errs.length > 0) {
        setUploadErrors(errs)
      } else {
        toast.success(`${data.success}건 상품이 등록되었습니다.`)
        load(1)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>상품</h2>
        <span className="sub">상품 등록·수정과 언어별 번역을 관리합니다.</span>
        <div className="page-head-actions">
          <button className="btn" onClick={downloadTemplate}>
            엑셀 템플릿
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <button
            className="btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '업로드 중…' : '엑셀 업로드'}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/products/new')}>
            + 상품 등록
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="field">
          <label>상품명</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
            placeholder="검색어"
          />
        </div>
        <div className="field">
          <label>사용여부</label>
          <select value={isActive} onChange={(e) => setIsActive(e.target.value)}>
            <option value="">전체</option>
            <option value="true">사용</option>
            <option value="false">미사용</option>
          </select>
        </div>
        <button className="btn" onClick={() => load(1)}>
          검색
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>코드</th>
                <th>상품명</th>
                <th>분류</th>
                <th>가격</th>
                <th>이벤트가</th>
                <th>노출기간</th>
                <th>상태</th>
                <th>번역</th>
                <th style={{ width: 120 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => navigate(`/products/${p.id}`)}>
                  <td>{p.code}</td>
                  <td>{p.name || <span className="hint">(미입력)</span>}</td>
                  <td>{p.categoryName || <span className="hint">-</span>}</td>
                  <td>{p.productPrice?.toLocaleString()}원</td>
                  <td>{p.eventPrice != null ? `${p.eventPrice.toLocaleString()}원` : <span className="hint">-</span>}</td>
                  <td className="hint">{formatPeriod(p.startDate, p.endDate)}</td>
                  <td>
                    <StatusBadge active={p.isActive} />
                  </td>
                  <td>
                    <NotInputLangs langs={p.notInputLanguages} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => navigate(`/products/${p.id}`)}
                      >
                        수정
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <Empty message="등록된 상품이 없습니다." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (
        <Pagination page={page} totalPage={totalPage} total={total} onChange={load} />
      )}

      {uploadErrors && (
        <UploadErrorModal errors={uploadErrors} onClose={() => setUploadErrors(null)} />
      )}
    </div>
  )
}

function UploadErrorModal({ errors, onClose }: { errors: UploadError[]; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 560, width: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>엑셀 업로드 오류</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '0 20px 8px' }}>
          <p style={{ margin: '0 0 12px', color: 'var(--text-muted)' }}>
            {errors.length}건의 오류가 발견되어 <strong>상품이 등록되지 않았습니다.</strong>
            <br />오류를 수정한 뒤 다시 업로드해 주세요.
          </p>
          <div
            style={{
              maxHeight: 320,
              overflow: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            <table className="data" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: 'center' }}>행</th>
                  <th>오류 내용</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{err.row}</td>
                    <td style={{ color: 'var(--danger, #e74c3c)' }}>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px 20px' }}>
          <button className="btn btn-primary" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
