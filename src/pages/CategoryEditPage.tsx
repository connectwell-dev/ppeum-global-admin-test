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
  CategoryProduct,
  CategoryTranslationView,
  ImageRef,
  Language,
  Paginated,
  ProductCategoryType,
  ProductListItem,
  WeekDayType,
} from '../lib/types'
import { Empty, Loading, Spinner, confirmDelete } from '../components/ui'
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

type TransForm = { name: string; image: ImageRef | null }

const emptyTrans: TransForm = { name: '', image: null }

const sameJSON = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export default function CategoryEditPage() {
  const { id } = useParams()
  const isNew = !id
  const categoryId = id ? Number(id) : null
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [base, setBase] = useState<BaseForm>(emptyBase)
  const [baseOriginal, setBaseOriginal] = useState<BaseForm>(emptyBase)
  const [isSimpleChange, setIsSimpleChange] = useState(false)

  const [tab, setTab] = useState<Language>(BASE_LANGUAGE)
  // 언어별 번역 폼을 클라이언트에 보존한다. 탭을 옮겼다 돌아와도 입력 중 내용이 유지된다.
  const [transForms, setTransForms] = useState<Record<string, TransForm>>({})
  const [transOriginals, setTransOriginals] = useState<Record<string, TransForm>>({})
  const [transMetas, setTransMetas] = useState<Record<string, CategoryTranslationView>>({})
  const [transLoading, setTransLoading] = useState(false)
  const [transSimple, setTransSimple] = useState(false)

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
        }
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  // 번역 1건을 서버에서 불러와 메타(재검수 알림)와 폼을 갱신한다.
  // 저장하지 않은 수정 내용은 보존하기 위해, force가 아니고 수정 중이면 폼/원본은 건드리지 않는다.
  const loadTranslation = async (language: Language, opts?: { force?: boolean }) => {
    if (!categoryId) return
    const v = await api.get<CategoryTranslationView>(
      `/api/v1/product-category/${categoryId}/translation`,
      { language },
    )
    setTransMetas((prev) => ({ ...prev, [language]: v }))
    const dirty =
      !!transForms[language] &&
      !!transOriginals[language] &&
      !sameJSON(transForms[language], transOriginals[language])
    if (opts?.force || !dirty) {
      const f: TransForm = { name: v.name ?? '', image: v.image }
      setTransForms((prev) => ({ ...prev, [language]: f }))
      setTransOriginals((prev) => ({ ...prev, [language]: f }))
    }
  }

  const switchTab = (next: Language) => {
    if (next === tab) return
    setTab(next)
    setTransSimple(false)
    if (isNew || next === BASE_LANGUAGE || !categoryId) return
    if (!transForms[next]) {
      // 처음 여는 탭: 전체 로드
      setTransLoading(true)
      loadTranslation(next)
        .catch((e) => toast.error(e instanceof ApiError ? e.message : '번역을 불러오지 못했습니다.'))
        .finally(() => setTransLoading(false))
    } else {
      // 캐시가 있으면 재검수 알림을 서버 기준으로 다시 갱신한다.(수정 중이면 폼은 보존)
      loadTranslation(next).catch(() => {})
    }
  }

  const trans = transForms[tab] ?? emptyTrans
  const setTrans = (f: TransForm) => setTransForms((prev) => ({ ...prev, [tab]: f }))
  const transMeta = transMetas[tab] ?? null

  const baseDirty = !isNew && !sameJSON(base, baseOriginal)
  const transDirty = (l: Language) =>
    !!transForms[l] && !!transOriginals[l] && !sameJSON(transForms[l], transOriginals[l])
  const tabDirty = (l: Language) => (l === BASE_LANGUAGE ? baseDirty : transDirty(l))

  const saveBase = async () => {
    if (!base.name.trim()) return toast.error(`기준 언어(${langLabel(BASE_LANGUAGE)}) 카테고리명은 필수입니다.`)
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
      if (isNew) {
        const res = await api.post<{ id: number }>('/api/v1/product-category', {
          ...common,
          categoryTranslations: [
            { language: BASE_LANGUAGE, name: base.name.trim(), imageCode: base.image?.code },
          ],
        })
        toast.success('카테고리가 등록되었습니다.')
        navigate(`/categories/${res.id}`, { replace: true })
      } else {
        await api.put(`/api/v1/product-category/${categoryId}`, {
          ...common,
          name: base.name.trim(),
          imageCode: base.image?.code,
          isSimpleChange,
        })
        toast.success('저장되었습니다.')
        setBaseOriginal(base)
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
      const payload = { language: tab, name: f.name.trim(), imageCode: f.image?.code }
      if (tab === PUBLIC_LANGUAGE) {
        await api.put(`/api/v1/product-category/${categoryId}/public-translation`, {
          ...payload,
          isSimpleChange: transSimple,
        })
      } else {
        await api.put(`/api/v1/product-category/${categoryId}/translation`, payload)
      }
      toast.success(`${langLabel(tab)} 번역이 저장되었습니다.`)
      // 저장 성공 → 서버 기준으로 다시 불러와 재검수 알림/원본 스냅샷을 갱신한다.
      await loadTranslation(tab, { force: true }).catch(() =>
        setTransOriginals((prev) => ({ ...prev, [tab]: f })),
      )
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
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/events')}>
          ← 목록
        </button>
        <h2>{isNew ? '카테고리 등록' : '카테고리 수정'}</h2>
      </div>

      {!isNew && (
        <div className="tabs" style={{ marginBottom: 18 }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              className={`tab${tab === l.value ? ' active' : ''}`}
              onClick={() => switchTab(l.value)}
            >
              {l.label}
              {l.value === BASE_LANGUAGE && ' (기준)'}
              {tabDirty(l.value) && (
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
      )}

      {tab === BASE_LANGUAGE ? (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>
            기본 정보 · {langLabel(BASE_LANGUAGE)}(기준)
            {baseDirty && (
              <span className="hint" style={{ marginLeft: 8, fontWeight: 400 }}>
                · 수정 중 (저장 전)
              </span>
            )}
          </h3>

          <div className="field-row">
            <div className="field">
              <label>유형 <span className="req">*</span></label>
              <select
                value={base.categoryType}
                onChange={(e) => setBase({ ...base, categoryType: e.target.value as ProductCategoryType })}
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

          <div className="field">
            <label>카테고리명 ({langLabel(BASE_LANGUAGE)}) <span className="req">*</span></label>
            <input value={base.name} onChange={(e) => setBase({ ...base, name: e.target.value })} />
          </div>
          <ImagePicker
            value={base.image}
            onChange={(img) => setBase({ ...base, image: img })}
            label={`이미지 (${langLabel(BASE_LANGUAGE)})`}
          />

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
              {saving ? <Spinner /> : isNew ? '카테고리 등록' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>
            {langLabel(tab)} 번역
            {transDirty(tab) && (
              <span className="hint" style={{ marginLeft: 8, fontWeight: 400 }}>
                · 수정 중 (저장 전)
              </span>
            )}
          </h3>
          {transLoading || !transForms[tab] ? (
            <Loading label="번역 불러오는 중…" />
          ) : (
            <>
              {transMeta && transMeta.notMatchKeys?.length > 0 && (
                <div className="alert alert-warn">
                  기준 언어가 변경되어 재검수가 필요한 항목이 있습니다. 아래 빨간색으로 표시된 항목을
                  확인해 주세요.
                </div>
              )}
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
                <div style={{ fontWeight: 600 }}>{transMeta?.originName || '-'}</div>
              </div>
              <div className="field">
                <label>카테고리명 ({langLabel(tab)}) <span className="req">*</span></label>
                <input
                  className={
                    transMeta?.notMatchKeys?.some((k) => k.key === 'name') ? 'input-error' : undefined
                  }
                  value={trans.name}
                  onChange={(e) => setTrans({ ...trans, name: e.target.value })}
                />
                {transMeta?.notMatchKeys?.some((k) => k.key === 'name') && (
                  <div className="field-error-note">기준 언어가 변경되어 재검수가 필요합니다.</div>
                )}
              </div>
              <ImagePicker
                value={trans.image}
                onChange={(img) => setTrans({ ...trans, image: img })}
                label={`이미지 (${langLabel(tab)})`}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {tab === PUBLIC_LANGUAGE && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={transSimple}
                      onChange={(e) => setTransSimple(e.target.checked)}
                    />
                    단순 변경
                  </label>
                )}
                <button
                  className="btn btn-primary"
                  style={{ marginLeft: 'auto' }}
                  onClick={saveTranslation}
                  disabled={saving}
                >
                  {saving ? <Spinner /> : '번역 저장'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!isNew && categoryId && <CategoryProductsSection categoryId={categoryId} />}
    </div>
  )
}

function CategoryProductsSection({ categoryId }: { categoryId: number }) {
  const toast = useToast()
  const [products, setProducts] = useState<CategoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [allProducts, setAllProducts] = useState<ProductListItem[]>([])
  const [addId, setAddId] = useState('')
  const [addPrice, setAddPrice] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get<CategoryProduct[]>(`/api/v1/product-category/${categoryId}/products`)
      setProducts(data)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '연결 상품을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    api
      .get<Paginated<ProductListItem>>('/api/v1/product/list', { page: 1, rowCount: 200 })
      .then((r) => setAllProducts(r.data))
      .catch(() => setAllProducts([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  const add = async () => {
    if (!addId) return toast.error('상품을 선택하세요.')
    try {
      await api.post(`/api/v1/product-category/${categoryId}/products`, {
        products: [{ productId: Number(addId), eventPrice: addPrice ? Number(addPrice) : null }],
      })
      toast.success('상품이 추가되었습니다.')
      setAddId('')
      setAddPrice('')
      load()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '추가에 실패했습니다.')
    }
  }

  const updateRow = (productId: number, patch: Partial<CategoryProduct>) =>
    setProducts((prev) => prev.map((p) => (p.productId === productId ? { ...p, ...patch } : p)))

  const saveAll = async () => {
    try {
      await api.put(`/api/v1/product-category/${categoryId}/products`, {
        products: products.map((p, i) => ({
          productId: p.productId,
          eventPrice: p.eventPrice ?? null,
          eventDiscountPercent: p.eventDiscountPercent ?? null,
          order: p.order ?? i + 1,
        })),
      })
      toast.success('연결 상품이 저장되었습니다.')
      load()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    }
  }

  const remove = async (p: CategoryProduct) => {
    if (!confirmDelete(p.name)) return
    try {
      await api.del(`/api/v1/product-category/${categoryId}/products`, { productIds: [p.productId] })
      toast.success('삭제되었습니다.')
      load()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '삭제에 실패했습니다.')
    }
  }

  const available = allProducts.filter(
    (p) => !products.some((ep) => ep.productId === p.id),
  )

  return (
    <div className="card card-pad" style={{ marginTop: 18 }}>
      <div className="page-head" style={{ marginBottom: 12 }}>
        <h3>연결 상품</h3>
        <div className="page-head-actions">
          <button className="btn btn-primary btn-sm" onClick={saveAll} disabled={loading}>
            연결 상품 저장
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="field" style={{ flex: 1 }}>
          <label>상품 추가</label>
          <select value={addId} onChange={(e) => setAddId(e.target.value)}>
            <option value="">상품 선택</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.code} ({p.productPrice?.toLocaleString()}원)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>이벤트가</label>
          <input
            type="number"
            value={addPrice}
            onChange={(e) => setAddPrice(e.target.value)}
            placeholder="선택"
          />
        </div>
        <button className="btn" onClick={add}>
          추가
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <Empty message="연결된 상품이 없습니다." />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>상품</th>
                <th>정상가</th>
                <th style={{ width: 130 }}>이벤트가</th>
                <th style={{ width: 110 }}>할인율(%)</th>
                <th style={{ width: 90 }}>순서</th>
                <th style={{ width: 80 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.productId}>
                  <td>
                    {p.name}
                    <div className="hint">{p.categoryName || '-'}</div>
                  </td>
                  <td>{p.productPrice?.toLocaleString()}원</td>
                  <td>
                    <input
                      type="number"
                      value={p.eventPrice ?? ''}
                      onChange={(e) =>
                        updateRow(p.productId, {
                          eventPrice: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={p.eventDiscountPercent ?? ''}
                      onChange={(e) =>
                        updateRow(p.productId, {
                          eventDiscountPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={p.order ?? ''}
                      onChange={(e) =>
                        updateRow(p.productId, { order: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(p)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
