import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import {
  BASE_LANGUAGE,
  LANGUAGES,
  PUBLIC_LANGUAGE,
  langLabel,
} from '../lib/constants'
import {
  loadProductDetailInfoOptions,
  type ProductDetailInfoOption,
} from '../lib/lookups'
import type {
  ImageRef,
  Language,
  ProductDetail,
  TranslationView,
} from '../lib/types'
import { Loading, Spinner } from '../components/ui'
import ImagePicker from '../components/ImagePicker'
import { imageUrl } from '../lib/image'

interface BaseForm {
  productPrice: number
  eventPrice: number | null
  startDate: string
  endDate: string
  isActive: boolean
  isView: boolean
  productDetailInfoId: number | null
  name: string
  description: string
  image: ImageRef | null
}

interface TransForm {
  name: string
  description: string
  isView: boolean
  image: ImageRef | null
}

const emptyBase: BaseForm = {
  productPrice: 0,
  eventPrice: null,
  startDate: '',
  endDate: '',
  isActive: true,
  isView: true,
  productDetailInfoId: null,
  name: '',
  description: '',
  image: null,
}

const emptyTrans: TransForm = { name: '', description: '', isView: true, image: null }

const sameJSON = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export default function ProductEditPage() {
  const { id } = useParams()
  const isNew = !id
  const productId = id ? Number(id) : null
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detailInfos, setDetailInfos] = useState<ProductDetailInfoOption[]>([])
  const [base, setBase] = useState<BaseForm>(emptyBase)
  const [baseOriginal, setBaseOriginal] = useState<BaseForm>(emptyBase)
  const [isSimpleChange, setIsSimpleChange] = useState(false)

  const [tab, setTab] = useState<Language>(BASE_LANGUAGE)
  // 언어별 번역 폼을 클라이언트에 보존한다. 탭을 옮겼다 돌아와도 입력 중 내용이 유지된다.
  const [transForms, setTransForms] = useState<Record<string, TransForm>>({})
  const [transOriginals, setTransOriginals] = useState<Record<string, TransForm>>({})
  const [transMetas, setTransMetas] = useState<Record<string, TranslationView>>({})
  const [transLoading, setTransLoading] = useState(false)
  const [transSimple, setTransSimple] = useState(false)

  // 초기 로드
  useEffect(() => {
    ;(async () => {
      try {
        const infos = await loadProductDetailInfoOptions()
        setDetailInfos(infos)
        if (productId) {
          const d = await api.get<ProductDetail>(`/api/v1/product/${productId}`)
          const loaded: BaseForm = {
            productPrice: d.productPrice ?? 0,
            eventPrice: d.eventPrice ?? null,
            startDate: d.startDate ?? '',
            endDate: d.endDate ?? '',
            isActive: d.isActive,
            isView: d.isView ?? true,
            productDetailInfoId: d.productDetailInfoId,
            name: d.productName ?? '',
            description: d.productDescription ?? '',
            image: d.image ?? null,
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
  }, [productId])

  // 번역 1건을 서버에서 불러와 메타(재검수 알림)와 폼을 갱신한다.
  // 저장하지 않은 수정 내용은 보존하기 위해, force가 아니고 수정 중이면 폼/원본은 건드리지 않는다.
  const loadTranslation = async (language: Language, opts?: { force?: boolean }) => {
    if (!productId) return
    const v = await api.get<TranslationView>(`/api/v1/product/${productId}/translation`, {
      language,
    })
    setTransMetas((prev) => ({ ...prev, [language]: v }))
    const dirty =
      !!transForms[language] &&
      !!transOriginals[language] &&
      !sameJSON(transForms[language], transOriginals[language])
    if (opts?.force || !dirty) {
      const f: TransForm = { name: v.name ?? '', description: v.description ?? '', isView: v.isView ?? true, image: v.image ?? null }
      setTransForms((prev) => ({ ...prev, [language]: f }))
      setTransOriginals((prev) => ({ ...prev, [language]: f }))
    }
  }

  const switchTab = (next: Language) => {
    if (next === tab) return
    setTab(next)
    setTransSimple(false)
    if (isNew || next === BASE_LANGUAGE || !productId) return
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

  const baseDirty = !isNew && !sameJSON(base, baseOriginal)
  const transDirty = (l: Language) =>
    !!transForms[l] && !!transOriginals[l] && !sameJSON(transForms[l], transOriginals[l])
  const tabDirty = (l: Language) => (l === BASE_LANGUAGE ? baseDirty : transDirty(l))

  // 등록 시 기준 언어 외에는 실제 입력이 있는 언어만 함께 보낸다.
  const transHasContent = (f: TransForm) =>
    f.name.trim() !== '' || f.description.trim() !== '' || !!f.image

  const saveBase = async () => {
    if (!base.name.trim()) return toast.error(`기준 언어(${langLabel(BASE_LANGUAGE)}) 상품명은 필수입니다.`)
    setSaving(true)
    try {
      const common = {
        productPrice: Number(base.productPrice),
        eventPrice: base.eventPrice != null ? Number(base.eventPrice) : undefined,
        startDate: base.startDate || undefined,
        endDate: base.endDate || undefined,
        isActive: base.isActive,
        productDetailInfoId: base.productDetailInfoId ?? undefined,
      }
      if (isNew) {
        // 기준 언어 + 입력 내용이 있는 다른 언어를 한 번에 등록한다.
        const otherTranslations = LANGUAGES.map((l) => l.value)
          .filter((l) => l !== BASE_LANGUAGE)
          .map((l) => ({ l, f: transForms[l] }))
          .filter((x): x is { l: Language; f: TransForm } => !!x.f && transHasContent(x.f))
          .map(({ l, f }) => ({
            language: l,
            name: f.name.trim() || undefined,
            description: f.description || undefined,
            imageCode: f.image?.code,
            isView: f.isView,
          }))
        const res = await api.post<{ id: number }>('/api/v1/product', {
          ...common,
          productTranslations: [
            {
              language: BASE_LANGUAGE,
              name: base.name.trim(),
              description: base.description || undefined,
              imageCode: base.image?.code,
              isView: base.isView,
            },
            ...otherTranslations,
          ],
        })
        toast.success('상품이 등록되었습니다.')
        navigate(`/products/${res.id}`, { replace: true })
      } else {
        await api.put(`/api/v1/product/${productId}`, {
          ...common,
          name: base.name.trim(),
          description: base.description || undefined,
          imageCode: base.image?.code,
          isView: base.isView,
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
    if (!productId) return
    const f = transForms[tab] ?? emptyTrans
    if (!f.name.trim()) return toast.error('상품명을 입력하세요.')
    setSaving(true)
    try {
      const payload = {
        language: tab,
        name: f.name.trim(),
        description: f.description || undefined,
        imageCode: f.image?.code,
        isView: f.isView,
      }
      if (tab === PUBLIC_LANGUAGE) {
        await api.put(`/api/v1/product/${productId}/public-translation`, {
          ...payload,
          isSimpleChange: transSimple,
        })
      } else {
        await api.put(`/api/v1/product/${productId}/translation`, payload)
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
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>
          ← 목록
        </button>
        <h2>{isNew ? '상품 등록' : '상품 수정'}</h2>
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
          언어 탭별로 입력한 뒤 한 번에 등록됩니다. 기준 언어({langLabel(BASE_LANGUAGE)}) 상품명은 필수입니다.
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
              <label>가격 <span className="req">*</span></label>
              <input
                type="number"
                value={base.productPrice}
                onChange={(e) => setBase({ ...base, productPrice: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>이벤트가</label>
              <input
                type="number"
                value={base.eventPrice ?? ''}
                onChange={(e) =>
                  setBase({ ...base, eventPrice: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="미입력 시 없음"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>상세페이지 연결</label>
              <select
                value={base.productDetailInfoId ?? ''}
                onChange={(e) =>
                  setBase({
                    ...base,
                    productDetailInfoId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">없음</option>
                {detailInfos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
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

          <div className="field">
            <label>옵션</label>
            <div className="checks">
              <label className="check">
                <input
                  type="checkbox"
                  checked={base.isActive}
                  onChange={(e) => setBase({ ...base, isActive: e.target.checked })}
                />
                사용
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={base.isView}
                  onChange={(e) => setBase({ ...base, isView: e.target.checked })}
                />
                {langLabel(BASE_LANGUAGE)} 노출
              </label>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', width: '100%' }} />

          <div className="field">
            <label>상품명 ({langLabel(BASE_LANGUAGE)}) <span className="req">*</span></label>
            <input
              value={base.name}
              onChange={(e) => setBase({ ...base, name: e.target.value })}
              placeholder="기준 언어 상품명"
            />
          </div>
          <div className="field">
            <label>설명 ({langLabel(BASE_LANGUAGE)})</label>
            <textarea
              value={base.description}
              onChange={(e) => setBase({ ...base, description: e.target.value })}
            />
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
              {saving ? <Spinner /> : isNew ? '상품 등록' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <TranslationPanel
          lang={tab}
          loading={!isNew && (transLoading || !transForms[tab])}
          meta={
            isNew
              ? {
                  name: '',
                  originName: base.name,
                  description: '',
                  originDescription: base.description,
                  image: null,
                  originImage: base.image,
                  isView: true,
                  notMatchKeys: [],
                }
              : transMetas[tab] ?? null
          }
          form={trans}
          setForm={setTrans}
          dirty={transDirty(tab)}
          isPublic={!isNew && tab === PUBLIC_LANGUAGE}
          simpleChange={transSimple}
          setSimpleChange={setTransSimple}
          onSave={isNew ? saveBase : saveTranslation}
          saveLabel={isNew ? '상품 등록' : '번역 저장'}
          saving={saving}
        />
      )}
    </div>
  )
}

function TranslationPanel({
  lang,
  loading,
  meta,
  form,
  setForm,
  dirty,
  isPublic,
  simpleChange,
  setSimpleChange,
  onSave,
  saveLabel = '번역 저장',
  saving,
}: {
  lang: Language
  loading: boolean
  meta: TranslationView | null
  form: TransForm
  setForm: (f: TransForm) => void
  dirty: boolean
  isPublic: boolean
  simpleChange: boolean
  setSimpleChange: (v: boolean) => void
  onSave: () => void
  saveLabel?: string
  saving: boolean
}) {
  if (loading) return <Loading label="번역 불러오는 중…" />
  const REVIEW_NOTE = '기준 언어가 변경되어 재검수가 필요합니다.'
  const notMatchSet = new Set((meta?.notMatchKeys ?? []).map((k) => k.key))
  const hasErr = (key: string) => notMatchSet.has(key)
  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3>
        {langLabel(lang)} 번역
        {dirty && (
          <span className="hint" style={{ marginLeft: 8, fontWeight: 400 }}>
            · 수정 중 (저장 전)
          </span>
        )}
      </h3>

      {notMatchSet.size > 0 && (
        <div className="alert alert-warn">
          기준 언어가 변경되어 재검수가 필요한 항목이 있습니다. 아래 빨간색으로 표시된 항목을 확인해
          주세요.
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
        <div style={{ fontWeight: 600 }}>{meta?.originName || '-'}</div>
        <div style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginTop: 4 }}>
          {meta?.originDescription || ''}
        </div>
        {meta?.originImage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <img
              src={imageUrl(meta.originImage.path)}
              alt={meta.originImage.name}
              style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
            />
            <span className="hint">기준 이미지: {meta.originImage.name}</span>
          </div>
        )}
      </div>

      <div className="field">
        <label>상품명 ({langLabel(lang)}) <span className="req">*</span></label>
        <input
          className={hasErr('name') ? 'input-error' : undefined}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        {hasErr('name') && <div className="field-error-note">{REVIEW_NOTE}</div>}
      </div>
      <div className="field">
        <label>설명 ({langLabel(lang)})</label>
        <textarea
          className={hasErr('description') ? 'input-error' : undefined}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        {hasErr('description') && <div className="field-error-note">{REVIEW_NOTE}</div>}
      </div>
      <ImagePicker
        value={form.image}
        onChange={(img) => setForm({ ...form, image: img })}
        label={`이미지 (${langLabel(lang)}) · 비우면 기준 언어 이미지가 사용됩니다`}
      />
      <div className="field">
        <label>옵션</label>
        <div className="checks">
          <label className="check">
            <input
              type="checkbox"
              checked={form.isView}
              onChange={(e) => setForm({ ...form, isView: e.target.checked })}
            />
            {langLabel(lang)} 노출
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {isPublic && (
          <label className="check">
            <input
              type="checkbox"
              checked={simpleChange}
              onChange={(e) => setSimpleChange(e.target.checked)}
            />
            단순 변경 (번역 재검수 불필요)
          </label>
        )}
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? <Spinner /> : saveLabel}
        </button>
      </div>
    </div>
  )
}
