import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import {
  BASE_LANGUAGE,
  CATEGORY_TYPES,
  LANGUAGES,
  PUBLIC_LANGUAGE,
  WEEK_DAYS,
  langLabel,
} from '../lib/constants'
import type {
  CategoryDetail,
  CategoryProductItem,
  CategoryTranslationView,
  ImageRef,
  Language,
  Paginated,
  ProductCategoryType,
  ProductGroup,
  ProductListItem,
  WeekDayType,
} from '../lib/types'
import { loadProductGroups } from '../lib/lookups'
import { Empty, Loading, Modal, Spinner } from '../components/ui'
import ImagePicker from '../components/ImagePicker'

interface BaseForm {
  categoryType: ProductCategoryType
  startDate: string
  endDate: string
  reservationStartDate: string
  reservationEndDate: string
  weekDay: WeekDayType[]
  isActive: boolean
  name: string
  image: ImageRef | null
}

const emptyBase: BaseForm = {
  categoryType: 'general',
  startDate: '',
  endDate: '',
  reservationStartDate: '',
  reservationEndDate: '',
  weekDay: [],
  isActive: true,
  name: '',
  image: null,
}

interface TransForm {
  name: string
  image: ImageRef | null
  isView: boolean
}

const emptyTrans: TransForm = { name: '', image: null, isView: true }

const sameJSON = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export default function CategoryEditPage() {
  const { id } = useParams()
  const isNew = !id
  const categoryId = id ? Number(id) : null
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Language>(BASE_LANGUAGE)

  const [base, setBase] = useState<BaseForm>(emptyBase)
  const [baseOriginal, setBaseOriginal] = useState<BaseForm>(emptyBase)
  const [isSimpleChange, setIsSimpleChange] = useState(false)

  const [products, setProducts] = useState<CategoryProductItem[]>([])
  const [productsOriginal, setProductsOriginal] = useState<CategoryProductItem[]>([])
  const [groups, setGroups] = useState<ProductGroup[]>([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [modalGroupId, setModalGroupId] = useState<string>('')
  const [modalSearch, setModalSearch] = useState('')
  const [modalProducts, setModalProducts] = useState<ProductListItem[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const [transForms, setTransForms] = useState<Record<string, TransForm>>({})
  const [transOriginals, setTransOriginals] = useState<Record<string, TransForm>>({})
  const [transMetas, setTransMetas] = useState<Record<string, CategoryTranslationView>>({})

  useEffect(() => {
    ;(async () => {
      try {
        if (categoryId) {
          const d = await api.get<CategoryDetail>(`/api/v1/product-category/${categoryId}`)
          const loaded: BaseForm = {
            categoryType: d.categoryType,
            startDate: d.startDate?.slice(0, 10) ?? '',
            endDate: d.endDate?.slice(0, 10) ?? '',
            reservationStartDate: d.reservationStartDate?.slice(0, 10) ?? '',
            reservationEndDate: d.reservationEndDate?.slice(0, 10) ?? '',
            weekDay: d.weekDay ?? [],
            isActive: d.isActive,
            name: d.name ?? '',
            image: d.image,
          }
          setBase(loaded)
          setBaseOriginal(loaded)
          setProducts(d.products ?? [])
          setProductsOriginal(d.products ?? [])
        }
        const g = await loadProductGroups()
        setGroups(g)
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  const loadTranslation = async (language: Language) => {
    if (!categoryId) return null
    const v = await api.get<CategoryTranslationView>(
      `/api/v1/product-category/${categoryId}/translation`,
      { language },
    )
    setTransMetas((prev) => ({ ...prev, [language]: v }))
    const f: TransForm = { name: v.name ?? '', image: v.image, isView: v.isView ?? true }
    return f
  }

  const switchTab = async (next: Language) => {
    if (next === tab) return
    setIsSimpleChange(false)
    if (isNew) {
      if (next !== BASE_LANGUAGE && !transForms[next]) {
        setTransForms((prev) => ({ ...prev, [next]: { ...emptyTrans } }))
        setTransOriginals((prev) => ({ ...prev, [next]: { ...emptyTrans } }))
      }
      setTab(next)
      return
    }
    setTab(next)
    if (next === BASE_LANGUAGE || !categoryId) return
    if (!transForms[next]) {
      setTabLoading(true)
      try {
        const f = await loadTranslation(next)
        if (f) {
          setTransForms((prev) => ({ ...prev, [next]: f }))
          setTransOriginals((prev) => ({ ...prev, [next]: f }))
        }
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '번역을 불러오지 못했습니다.')
      } finally {
        setTabLoading(false)
      }
    } else {
      loadTranslation(next)
        .then((f) => {
          if (!f) return
          const wasDirty =
            !!transForms[next] &&
            !!transOriginals[next] &&
            !sameJSON(transForms[next], transOriginals[next])
          if (!wasDirty) {
            setTransForms((prev) => ({ ...prev, [next]: f }))
            setTransOriginals((prev) => ({ ...prev, [next]: f }))
          }
        })
        .catch(() => {})
    }
  }

  const trans = transForms[tab] ?? emptyTrans
  const setTrans = (f: TransForm) => setTransForms((prev) => ({ ...prev, [tab]: f }))
  const transMeta = transMetas[tab] ?? null

  const baseDirty =
    !isNew && (!sameJSON(base, baseOriginal) || !sameJSON(products, productsOriginal))
  const transDirty = (l: Language) =>
    !!transForms[l] && !!transOriginals[l] && !sameJSON(transForms[l], transOriginals[l])
  const tabDirty = (l: Language) => (l === BASE_LANGUAGE ? baseDirty : transDirty(l))

  const removeProduct = (productId: number) =>
    setProducts((prev) =>
      prev
        .filter((p) => p.productId !== productId)
        .map((p, i) => ({ ...p, order: i + 1 })),
    )

  const reorder = (from: number, to: number) => {
    setProducts((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((p, i) => ({ ...p, order: i + 1 }))
    })
  }

  // 팝업 상품 목록을 서버에서 조회한다.
  const fetchModalProducts = async (groupId?: string, name?: string) => {
    setModalLoading(true)
    try {
      const query: Record<string, unknown> = { page: 1, rowCount: 500 }
      if (groupId) query.productGroupId = Number(groupId)
      if (name?.trim()) query.name = name.trim()
      const r = await api.get<Paginated<ProductListItem>>('/api/v1/product/list', query)
      setModalProducts(r.data)
    } catch {
      setModalProducts([])
    } finally {
      setModalLoading(false)
    }
  }

  // 팝업에서 이미 등록된 상품을 제외한 목록
  const existingIds = new Set(products.map((p) => p.productId))
  const availableForModal = modalProducts.filter((p) => !existingIds.has(p.id))

  const allFilteredChecked =
    availableForModal.length > 0 && availableForModal.every((p) => checked.has(p.id))

  const toggleCheck = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () => {
    if (allFilteredChecked) {
      setChecked((prev) => {
        const next = new Set(prev)
        availableForModal.forEach((p) => next.delete(p.id))
        return next
      })
    } else {
      setChecked((prev) => {
        const next = new Set(prev)
        availableForModal.forEach((p) => next.add(p.id))
        return next
      })
    }
  }

  const confirmAdd = () => {
    const toAdd = modalProducts.filter((p) => checked.has(p.id) && !existingIds.has(p.id))
    if (toAdd.length === 0) {
      toast.error('추가할 상품을 선택하세요.')
      return
    }
    setProducts((prev) => [
      ...prev,
      ...toAdd.map((p, i) => ({
        productId: p.id,
        name: p.name,
        productPrice: p.productPrice,
        eventPrice: p.eventPrice ?? null,
        promotionPrice: null,
        eventDiscountPercent: 0,
        order: prev.length + i + 1,
      })),
    ])
    setShowProductModal(false)
    setChecked(new Set())
    setModalGroupId('')
    setModalSearch('')
  }

  const openProductModal = () => {
    setChecked(new Set())
    setModalGroupId('')
    setModalSearch('')
    setShowProductModal(true)
    fetchModalProducts()
  }

  const handleGroupChange = (gid: string) => {
    setModalGroupId(gid)
    fetchModalProducts(gid, modalSearch)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      fetchModalProducts(modalGroupId, modalSearch)
    }
  }

  const saveBase = async () => {
    if (!base.name.trim())
      return toast.error(`기준 언어(${langLabel(BASE_LANGUAGE)}) 카테고리명은 필수입니다.`)
    setSaving(true)
    try {
      const common = {
        categoryType: base.categoryType,
        startDate: base.startDate || null,
        endDate: base.endDate || null,
        reservationStartDate: base.reservationStartDate || null,
        reservationEndDate: base.reservationEndDate || null,
        weekDay: base.weekDay,
        isActive: base.isActive,
      }
      const productsPayload = products.map((p) => ({
        productId: p.productId,
        promotionPrice: p.promotionPrice ?? null,
        order: p.order,
      }))

      if (isNew) {
        const categoryTranslations: Record<string, unknown>[] = [
          { language: BASE_LANGUAGE, name: base.name.trim(), imageCode: base.image?.code },
        ]
        for (const l of LANGUAGES.map((x) => x.value)) {
          if (l === BASE_LANGUAGE) continue
          const f = transForms[l]
          if (!f || !f.name.trim()) continue
          categoryTranslations.push({
            language: l,
            name: f.name.trim(),
            imageCode: f.image?.code,
            isView: f.isView,
          })
        }
        const res = await api.post<{ id: number }>('/api/v1/product-category', {
          ...common,
          categoryTranslations,
          products: productsPayload,
        })
        toast.success('카테고리가 등록되었습니다.')
        navigate(`/categories/${res.id}`, { replace: true })
      } else {
        await api.put(`/api/v1/product-category/${categoryId}`, {
          ...common,
          name: base.name.trim(),
          imageCode: base.image?.code,
          isSimpleChange,
          products: productsPayload,
        })
        toast.success('저장되었습니다.')
        setBaseOriginal(base)
        setProductsOriginal([...products])
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const saveTranslation = async () => {
    if (!categoryId) return
    const f = transForms[tab] ?? emptyTrans
    if (!f.name.trim()) return toast.error('카테고리명을 입력하세요.')
    setSaving(true)
    try {
      const payload = {
        language: tab,
        name: f.name.trim(),
        imageCode: f.image?.code,
        isView: f.isView,
      }
      if (tab === PUBLIC_LANGUAGE) {
        await api.put(`/api/v1/product-category/${categoryId}/public-translation`, {
          ...payload,
          isSimpleChange,
        })
      } else {
        await api.put(`/api/v1/product-category/${categoryId}/translation`, payload)
      }
      toast.success(`${langLabel(tab)} 번역이 저장되었습니다.`)
      try {
        const updated = await loadTranslation(tab)
        if (updated) {
          setTransForms((prev) => ({ ...prev, [tab]: updated }))
          setTransOriginals((prev) => ({ ...prev, [tab]: updated }))
        }
      } catch {
        setTransOriginals((prev) => ({ ...prev, [tab]: f }))
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-head">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/categories')}>
          ← 목록
        </button>
        <h2>{isNew ? '카테고리 등록' : '카테고리 수정'}</h2>
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {LANGUAGES.map((l) => (
          <button
            key={l.value}
            className={`tab${tab === l.value ? ' active' : ''}`}
            onClick={() => switchTab(l.value)}
          >
            {l.label}
            {l.value === BASE_LANGUAGE && ' (기준)'}
            {!isNew && tabDirty(l.value) && (
              <span
                title="저장하지 않은 수정 내용이 있습니다"
                style={{ color: 'var(--primary, #4f6bed)', marginLeft: 4 }}
              >
                ●
              </span>
            )}
          </button>
        ))}
      </div>
      {isNew && (
        <div className="hint" style={{ marginBottom: 12 }}>
          언어 탭별로 입력한 뒤 한 번에 등록됩니다. 기준 언어({langLabel(BASE_LANGUAGE)}) 카테고리명은
          필수입니다.
        </div>
      )}

      {tab === BASE_LANGUAGE ? (
        <div
          className="card card-pad"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <h3>
            기본 정보 · {langLabel(BASE_LANGUAGE)}(기준)
            {baseDirty && (
              <span className="hint" style={{ marginLeft: 8, fontWeight: 400 }}>
                · 수정 중 (저장 전)
              </span>
            )}
          </h3>

          <div className="field">
            <label>
              카테고리명 ({langLabel(BASE_LANGUAGE)}) <span className="req">*</span>
            </label>
            <input
              value={base.name}
              onChange={(e) => setBase({ ...base, name: e.target.value })}
            />
          </div>
          <ImagePicker
            value={base.image}
            onChange={(img) => setBase({ ...base, image: img })}
            label={`이미지 (${langLabel(BASE_LANGUAGE)})`}
          />

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', width: '100%' }} />

          <div className="field-row">
            <div className="field">
              <label>
                유형 <span className="req">*</span>
              </label>
              <select
                value={base.categoryType}
                onChange={(e) =>
                  setBase({ ...base, categoryType: e.target.value as ProductCategoryType })
                }
              >
                {CATEGORY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>노출 시작일</label>
              <input
                type="date"
                value={base.startDate}
                onChange={(e) => setBase({ ...base, startDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>노출 종료일</label>
              <input
                type="date"
                value={base.endDate}
                onChange={(e) => setBase({ ...base, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>예약가능 시작일</label>
              <input
                type="date"
                value={base.reservationStartDate}
                onChange={(e) => setBase({ ...base, reservationStartDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>예약가능 종료일</label>
              <input
                type="date"
                value={base.reservationEndDate}
                onChange={(e) => setBase({ ...base, reservationEndDate: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label>요일</label>
            <div className="checks">
              {WEEK_DAYS.map((w) => (
                <label className="check" key={w.value}>
                  <input
                    type="checkbox"
                    checked={base.weekDay.includes(w.value)}
                    onChange={(e) =>
                      setBase({
                        ...base,
                        weekDay: e.target.checked
                          ? [...base.weekDay, w.value]
                          : base.weekDay.filter((v) => v !== w.value),
                      })
                    }
                  />
                  {w.label}
                </label>
              ))}
            </div>
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={base.isActive}
              onChange={(e) => setBase({ ...base, isActive: e.target.checked })}
            />
            사용함
          </label>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', width: '100%' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h4 style={{ margin: 0 }}>연결 상품</h4>
            <button className="btn btn-sm" onClick={openProductModal}>
              + 상품 추가
            </button>
          </div>

          {products.length === 0 ? (
            <Empty message="연결된 상품이 없습니다." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>상품명</th>
                    <th style={{ width: 120 }}>정상가</th>
                    <th style={{ width: 120 }}>이벤트가</th>
                    <th style={{ width: 80 }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, idx) => (
                    <tr
                      key={p.productId}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIdx !== null && dragIdx !== idx) reorder(dragIdx, idx)
                        setDragIdx(null)
                      }}
                      onDragEnd={() => setDragIdx(null)}
                      style={{
                        cursor: 'grab',
                        opacity: dragIdx === idx ? 0.4 : 1,
                      }}
                    >
                      <td style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                        {p.order}
                      </td>
                      <td>{p.name}</td>
                      <td>{p.productPrice?.toLocaleString()}원</td>
                      <td>
                        {p.eventPrice != null ? `${p.eventPrice.toLocaleString()}원` : '-'}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => removeProduct(p.productId)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showProductModal && (
            <Modal
              title="상품 추가"
              size="lg"
              onClose={() => setShowProductModal(false)}
              footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="btn" onClick={() => setShowProductModal(false)}>
                    취소
                  </button>
                  <button className="btn btn-primary" onClick={confirmAdd}>
                    {checked.size}개 추가
                  </button>
                </div>
              }
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <select
                  value={modalGroupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                  style={{ width: 200 }}
                >
                  <option value="">전체 그룹</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="상품명 검색 후 Enter"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-sm"
                  onClick={() => fetchModalProducts(modalGroupId, modalSearch)}
                >
                  검색
                </button>
              </div>

              {modalLoading ? (
                <Loading label="상품 불러오는 중…" />
              ) : availableForModal.length === 0 ? (
                <Empty message="조건에 맞는 상품이 없습니다." />
              ) : (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  <table className="data">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input
                            type="checkbox"
                            checked={allFilteredChecked}
                            onChange={toggleAll}
                          />
                        </th>
                        <th>상품명</th>
                        <th style={{ width: 120 }}>정상가</th>
                        <th style={{ width: 120 }}>이벤트가</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableForModal.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={checked.has(p.id)}
                              onChange={() => toggleCheck(p.id)}
                            />
                          </td>
                          <td>{p.name || p.code}</td>
                          <td>{p.productPrice?.toLocaleString()}원</td>
                          <td>{p.eventPrice != null ? `${p.eventPrice.toLocaleString()}원` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Modal>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {!isNew && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={isSimpleChange}
                  onChange={(e) => setIsSimpleChange(e.target.checked)}
                />
                단순 변경 (번역 재검수 불필요)
              </label>
            )}
            <button
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={saveBase}
              disabled={saving}
            >
              {saving ? <Spinner /> : isNew ? '등록' : '저장'}
            </button>
          </div>
        </div>
      ) : tabLoading || (!isNew && !transForms[tab]) ? (
        <Loading label="번역 불러오는 중…" />
      ) : (
        <div
          className="card card-pad"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <h3>
            {langLabel(tab)} 번역
            {transDirty(tab) && (
              <span className="hint" style={{ marginLeft: 8, fontWeight: 400 }}>
                · 수정 중 (저장 전)
              </span>
            )}
          </h3>

          {!isNew && transMeta && transMeta.notMatchKeys?.length > 0 && (
            <div className="alert alert-warn">
              기준 언어가 변경되어 재검수가 필요한 항목이 있습니다. 아래 빨간색으로 표시된 항목을
              확인해 주세요.
            </div>
          )}

          {!isNew && transMeta && (
            <div
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div className="hint" style={{ marginBottom: 6 }}>
                기준 언어({langLabel(BASE_LANGUAGE)}) 원문
              </div>
              <div style={{ fontWeight: 600 }}>{transMeta.originName || '-'}</div>
            </div>
          )}

          <div className="field">
            <label>
              카테고리명 ({langLabel(tab)}) <span className="req">*</span>
            </label>
            <input
              className={
                !isNew && transMeta?.notMatchKeys?.some((k) => k.key === 'name')
                  ? 'input-error'
                  : undefined
              }
              value={trans.name}
              onChange={(e) => setTrans({ ...trans, name: e.target.value })}
            />
            {!isNew && transMeta?.notMatchKeys?.some((k) => k.key === 'name') && (
              <div className="field-error-note">기준 언어가 변경되어 재검수가 필요합니다.</div>
            )}
          </div>

          <ImagePicker
            value={trans.image}
            onChange={(img) => setTrans({ ...trans, image: img })}
            label={`이미지 (${langLabel(tab)})`}
          />

          <label className="check">
            <input
              type="checkbox"
              checked={trans.isView}
              onChange={(e) => setTrans({ ...trans, isView: e.target.checked })}
            />
            이 언어에서 노출
          </label>

          {!isNew && transMeta?.products && transMeta.products.length > 0 && (
            <>
              <hr
                style={{ border: 'none', borderTop: '1px solid var(--border)', width: '100%' }}
              />
              <h4>연결 상품 ({langLabel(tab)})</h4>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>상품명</th>
                      <th>정상가</th>
                      <th>이벤트가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transMeta.products.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.name}</td>
                        <td>{p.productPrice?.toLocaleString()}원</td>
                        <td>{p.eventPrice != null ? `${p.eventPrice.toLocaleString()}원` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {!isNew && tab === PUBLIC_LANGUAGE && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={isSimpleChange}
                  onChange={(e) => setIsSimpleChange(e.target.checked)}
                />
                단순 변경
              </label>
            )}
            <button
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={isNew ? saveBase : saveTranslation}
              disabled={saving}
            >
              {saving ? <Spinner /> : isNew ? '등록' : '번역 저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
