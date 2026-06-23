import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { useLang } from '../lib/lang'
import { BASE_LANGUAGE, CATEGORY_TYPES, WEEK_DAYS } from '../lib/constants'
import type { CategoryListItem, Paginated, ProductCategoryType, WeekDayType } from '../lib/types'
import {
  Empty,
  Loading,
  Modal,
  Pagination,
  StatusBadge,
  NotInputLangs,
  confirmDelete,
} from '../components/ui'

const ROW_COUNT = 10

interface OrderItem {
  id: number
  order: number
  name: string
}

const categoryTypeLabel = (t: ProductCategoryType) =>
  CATEGORY_TYPES.find((e) => e.value === t)?.label ?? t

const weekDayLabel = (days: WeekDayType[]) =>
  (days ?? []).map((d) => WEEK_DAYS.find((w) => w.value === d)?.label ?? d).join('·')

export default function CategoriesPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { lang } = useLang()

  const [items, setItems] = useState<CategoryListItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPage, setTotalPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')

  const [orderType, setOrderType] = useState<ProductCategoryType | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderDragIdx, setOrderDragIdx] = useState<number | null>(null)
  const [orderSaving, setOrderSaving] = useState(false)

  const openOrderModal = async (type: ProductCategoryType) => {
    setOrderType(type)
    setOrderLoading(true)
    try {
      const res = await api.get<Paginated<CategoryListItem>>(
        '/api/v1/product-category/list',
        { page: 1, rowCount: 999, categoryType: type },
      )
      setOrderItems(
        res.data
          .sort((a, b) => a.order - b.order)
          .map((c, i) => ({ id: c.id, order: i + 1, name: c.name })),
      )
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '목록을 불러오지 못했습니다.')
      setOrderType(null)
    } finally {
      setOrderLoading(false)
    }
  }

  const reorderItems = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    const next = [...orderItems]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setOrderItems(next.map((it, i) => ({ ...it, order: i + 1 })))
  }

  const saveOrder = async () => {
    if (!orderType) return
    setOrderSaving(true)
    try {
      await api.patch('/api/v1/product-category/order', {
        categoryType: orderType,
        items: orderItems.map((it) => ({ id: it.id, order: it.order })),
      })
      toast.success('순서가 저장되었습니다.')
      setOrderType(null)
      load(page)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '순서 저장에 실패했습니다.')
    } finally {
      setOrderSaving(false)
    }
  }

  const load = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await api.get<Paginated<CategoryListItem>>('/api/v1/product-category/list', {
          page: p,
          rowCount: ROW_COUNT,
          name: searchName || undefined,
        })
        setItems(res.data)
        setTotal(res.total)
        setTotalPage(res.totalPage)
        setPage(res.page)
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '카테고리를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    },
    [searchName, toast],
  )

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const toggle = async (item: CategoryListItem) => {
    try {
      await api.patch(`/api/v1/product-category/${item.id}/toggle`, { isActive: !item.isActive })
      toast.success('변경되었습니다.')
      load(page)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '변경에 실패했습니다.')
    }
  }

  const remove = async (item: CategoryListItem) => {
    if (!confirmDelete(item.name || item.code)) return
    try {
      await api.del(`/api/v1/product-category/${item.id}`)
      toast.success('삭제되었습니다.')
      load(page)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>카테고리</h2>
        <span className="sub">카테고리와 연결 상품, 언어별 번역을 관리합니다.</span>
        <div className="page-head-actions">
          <button className="btn btn-primary" onClick={() => navigate('/categories/new')}>
            + 카테고리 등록
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="field">
          <label>카테고리명</label>
          <input
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
            placeholder="검색어"
          />
        </div>
        <button className="btn" onClick={() => load(1)}>
          검색
        </button>
        {lang === BASE_LANGUAGE && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => openOrderModal('general')}>
              카테고리 순서변경
            </button>
            <button className="btn" onClick={() => openOrderModal('promotion')}>
              프로모션 순서변경
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>카테고리명</th>
                <th>유형</th>
                <th>노출기간</th>
                <th>예약가능기간</th>
                <th>요일</th>
                <th>상태</th>
                <th>번역</th>
                <th style={{ width: 170 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ev) => (
                <tr key={ev.id} className="clickable" onClick={() => navigate(`/categories/${ev.id}`)}>
                  <td>{ev.name || <span className="hint">(미입력)</span>}</td>
                  <td>{categoryTypeLabel(ev.categoryType)}</td>
                  <td>
                    {ev.startDate ? (
                      <span className="hint">
                        {ev.startDate?.slice(0, 10)} ~ {ev.endDate?.slice(0, 10) || ''}
                      </span>
                    ) : (
                      <span className="hint">-</span>
                    )}
                  </td>
                  <td>
                    {ev.reservationStartDate ? (
                      <span className="hint">
                        {ev.reservationStartDate?.slice(0, 10)} ~{' '}
                        {ev.reservationEndDate?.slice(0, 10) || ''}
                      </span>
                    ) : (
                      <span className="hint">-</span>
                    )}
                  </td>
                  <td>{weekDayLabel(ev.weekDay) || <span className="hint">-</span>}</td>
                  <td>
                    <StatusBadge active={ev.isActive} />
                  </td>
                  <td>
                    <NotInputLangs langs={ev.notInputLanguages} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button className="btn btn-sm" onClick={() => toggle(ev)}>
                        {ev.isActive ? '중지' : '시작'}
                      </button>
                      <button className="btn btn-sm" onClick={() => navigate(`/categories/${ev.id}`)}>
                        수정
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(ev)}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <Empty message="등록된 카테고리가 없습니다." />
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

      {orderType && (
        <Modal
          title={`${orderType === 'general' ? '카테고리' : '프로모션'} 순서변경`}
          onClose={() => setOrderType(null)}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setOrderType(null)}>
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={saveOrder}
                disabled={orderSaving}
              >
                {orderSaving ? '저장 중…' : '저장'}
              </button>
            </div>
          }
        >
          {orderLoading ? (
            <Loading />
          ) : orderItems.length === 0 ? (
            <Empty message="항목이 없습니다." />
          ) : (
            <table className="data" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>순서</th>
                  <th>카테고리명</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((it, idx) => (
                  <tr
                    key={it.id}
                    draggable
                    onDragStart={() => setOrderDragIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (orderDragIdx !== null) reorderItems(orderDragIdx, idx)
                      setOrderDragIdx(null)
                    }}
                    onDragEnd={() => setOrderDragIdx(null)}
                    style={{
                      cursor: 'grab',
                      opacity: orderDragIdx === idx ? 0.4 : 1,
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>{it.order}</td>
                    <td>{it.name || <span className="hint">(미입력)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  )
}
