import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { useLang } from '../lib/lang'
import type { ProductDetailInfoListItem, Paginated } from '../lib/types'
import {
  Empty,
  Loading,
  Pagination,
  NotInputLangs,
  confirmDelete,
} from '../components/ui'

const ROW_COUNT = 10

export default function ProductDetailInfoPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { lang } = useLang()

  const [items, setItems] = useState<ProductDetailInfoListItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPage, setTotalPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')

  const load = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await api.get<Paginated<ProductDetailInfoListItem>>(
          '/api/v1/product-detail-info/list',
          { page: p, rowCount: ROW_COUNT, title: title || undefined },
        )
        setItems(res.data)
        setTotal(res.total)
        setTotalPage(res.totalPage)
        setPage(res.page)
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '상세페이지를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    },
    [title, toast],
  )

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const remove = async (item: ProductDetailInfoListItem) => {
    if (!confirmDelete(item.title)) return
    try {
      await api.del(`/api/v1/product-detail-info/${item.id}`)
      toast.success('삭제되었습니다.')
      load(page)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>상세페이지</h2>
        <span className="sub">상세페이지 콘텐츠와 언어별 번역을 관리합니다.</span>
        <div className="page-head-actions">
          <button className="btn btn-primary" onClick={() => navigate('/product-detail-info/new')}>
            + 상세페이지 등록
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="field">
          <label>제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
            placeholder="검색어"
          />
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
                <th>제목</th>
                <th>해시태그</th>
                <th>메모</th>
                <th>번역</th>
                <th style={{ width: 120 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr
                  key={o.id}
                  className="clickable"
                  onClick={() => navigate(`/product-detail-info/${o.id}`)}
                >
                  <td>{o.code}</td>
                  <td>{o.title || <span className="hint">(미입력)</span>}</td>
                  <td>
                    <span className="badge-row">
                      {(o.hashtag ?? []).map((h, i) => (
                        <span key={i} className="badge badge-gray">
                          #{h}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="wrap">
                    <span className="hint">{o.note || '-'}</span>
                  </td>
                  <td>
                    <NotInputLangs langs={o.notInputLanguages} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => navigate(`/product-detail-info/${o.id}`)}
                      >
                        수정
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(o)}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <Empty message="등록된 상세페이지가 없습니다." />
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
    </div>
  )
}
