import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import {
  BASE_LANGUAGE,
  LANGUAGES,
  OPERATION_SHORT_DESC_KEYS,
  PUBLIC_LANGUAGE,
  langLabel,
} from '../lib/constants'
import type {
  ImageRef,
  KeyValue,
  Language,
  NotMatchKey,
  OperationInfoDetail,
} from '../lib/types'
import { ChipsInput, KeyValueEditor, Loading, Spinner } from '../components/ui'
import ImagePicker from '../components/ImagePicker'

interface OpForm {
  title: string
  description: string
  shortDescription: KeyValue[]
  image: ImageRef | null
  hashtag: string[]
  caution: string[]
  note: string
}

const emptyForm: OpForm = {
  title: '',
  description: '',
  shortDescription: [],
  image: null,
  hashtag: [],
  caution: [],
  note: '',
}

// 언어별 고정 항목(디폴트)을 항상 맨 앞에 채우고, 그 외 입력값은 뒤에 추가 항목으로 둔다.
const withDefaultShortDesc = (lang: Language, items: KeyValue[]): KeyValue[] => {
  const keys = OPERATION_SHORT_DESC_KEYS[lang] ?? []
  const fixed = keys.map((key) => ({
    key,
    value: items.find((s) => s.key === key)?.value ?? '',
  }))
  const extras = items.filter((s) => !keys.includes(s.key))
  return [...fixed, ...extras]
}

const initialForm = (lang: Language): OpForm => ({
  ...emptyForm,
  shortDescription: withDefaultShortDesc(lang, []),
})

const toForm = (d: OperationInfoDetail, lang: Language): OpForm => ({
  title: d.title ?? '',
  description: d.description ?? '',
  shortDescription: withDefaultShortDesc(lang, d.shortDescription ?? []),
  image: d.image,
  hashtag: d.hashtag ?? [],
  caution: d.caution ?? [],
  note: d.note ?? '',
})

const sameForm = (a: OpForm, b: OpForm) => JSON.stringify(a) === JSON.stringify(b)

export default function OperationInfoEditPage() {
  const { id } = useParams()
  const isNew = !id
  const opId = id ? Number(id) : null
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Language>(BASE_LANGUAGE)

  // 언어별 폼 상태를 클라이언트에 보존한다.
  // 탭을 옮겼다가 돌아와도 입력(수정) 중 내용이 그대로 유지된다.
  const [forms, setForms] = useState<Record<string, OpForm>>(
    isNew ? { [BASE_LANGUAGE]: initialForm(BASE_LANGUAGE) } : {},
  )
  // 서버에서 마지막으로 불러온/저장한 원본 스냅샷 (수정중 여부 비교용)
  const [originals, setOriginals] = useState<Record<string, OpForm>>(
    isNew ? { [BASE_LANGUAGE]: initialForm(BASE_LANGUAGE) } : {},
  )
  const [notMatchMap, setNotMatchMap] = useState<Record<string, NotMatchKey[]>>({})
  const [isSimpleChange, setIsSimpleChange] = useState(false)

  const fetchDetail = (language: Language) =>
    api.get<OperationInfoDetail>(`/api/v1/operation-info/${opId}`, { language })

  const loadLang = async (language: Language) => {
    const d = await fetchDetail(language)
    const f = toForm(d, language)
    setForms((prev) => ({ ...prev, [language]: f }))
    setOriginals((prev) => ({ ...prev, [language]: f }))
    setNotMatchMap((prev) => ({ ...prev, [language]: d.notMatchKeys ?? [] }))
  }

  // 초기 로드 (기준 언어)
  useEffect(() => {
    ;(async () => {
      try {
        if (opId) await loadLang(BASE_LANGUAGE)
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opId])

  const switchTab = async (next: Language) => {
    if (next === tab) return
    setIsSimpleChange(false)
    // 신규 등록: 처음 여는 언어 탭은 디폴트 항목으로 초기화하고 클라 상태로 보존한다.
    if (isNew) {
      if (!forms[next]) {
        const init = initialForm(next)
        setForms((prev) => ({ ...prev, [next]: init }))
        setOriginals((prev) => ({ ...prev, [next]: init }))
      }
      setTab(next)
      return
    }
    setTab(next)
    if (!opId) return
    // 처음 여는 탭은 전체 로드한다.
    if (!forms[next]) {
      setTabLoading(true)
      try {
        await loadLang(next)
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '번역을 불러오지 못했습니다.')
      } finally {
        setTabLoading(false)
      }
      return
    }
    // 이미 캐시가 있으면 재검수 알림을 서버 기준으로 다시 갱신한다.
    // 저장하지 않은 수정 내용은 그대로 보존하고, 수정 중이 아니면 폼/원본도 최신화한다.
    try {
      const wasDirty = isDirty(next)
      const d = await fetchDetail(next)
      setNotMatchMap((prev) => ({ ...prev, [next]: d.notMatchKeys ?? [] }))
      if (!wasDirty) {
        const f = toForm(d, next)
        setForms((prev) => ({ ...prev, [next]: f }))
        setOriginals((prev) => ({ ...prev, [next]: f }))
      }
    } catch {
      // 알림 갱신 실패는 조용히 무시(기존 표시 유지)
    }
  }

  const current = forms[tab]
  const patch = (p: Partial<OpForm>) =>
    setForms((prev) => ({ ...prev, [tab]: { ...prev[tab], ...p } }))

  const isDirty = (lang: Language) =>
    !!forms[lang] && !!originals[lang] && !sameForm(forms[lang], originals[lang])

  // 현재 탭 데이터만 페이로드로 구성한다.
  const buildPayload = (f: OpForm) => ({
    title: f.title.trim() || undefined,
    description: f.description || undefined,
    // 항목명이 빈 행은 제외한다. (값은 비워도 등록 가능)
    shortDescription: f.shortDescription.filter((s) => s.key.trim() !== ''),
    imageCode: f.image?.code,
    hashtag: f.hashtag,
    caution: f.caution,
    note: f.note || undefined,
  })

  // 기준 언어 외에는 실제로 입력한 내용이 있을 때만 함께 등록한다.
  const hasContent = (f: OpForm) =>
    f.title.trim() !== '' ||
    f.description.trim() !== '' ||
    f.hashtag.length > 0 ||
    f.caution.length > 0 ||
    f.note.trim() !== '' ||
    !!f.image ||
    f.shortDescription.some((s) => s.value.trim() !== '')

  // 신규 등록: 입력된 모든 언어를 한 번에 등록한다.
  const createAll = async () => {
    const baseF = forms[BASE_LANGUAGE]
    if (!baseF || !baseF.title.trim()) {
      setTab(BASE_LANGUAGE)
      return toast.error(`기준 언어(${langLabel(BASE_LANGUAGE)}) 제목을 입력하세요.`)
    }
    setSaving(true)
    try {
      const body: Record<string, ReturnType<typeof buildPayload>> = {}
      for (const l of LANGUAGES.map((x) => x.value)) {
        const f = forms[l]
        if (!f) continue
        if (l === BASE_LANGUAGE || hasContent(f)) body[l] = buildPayload(f)
      }
      const res = await api.post<{ id: number }>('/api/v1/operation-info', body)
      toast.success('시술 설명이 등록되었습니다.')
      navigate(`/operation-info/${res.id}`, { replace: true })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (isNew) return createAll()
    const f = forms[tab]
    if (!f) return
    if (tab === BASE_LANGUAGE && !f.title.trim()) return toast.error('제목을 입력하세요.')
    setSaving(true)
    try {
      const payload = buildPayload(f)
      if (tab === BASE_LANGUAGE) {
        await api.put(`/api/v1/operation-info/${opId}`, { ...payload, isSimpleChange })
      } else if (tab === PUBLIC_LANGUAGE) {
        await api.put(`/api/v1/operation-info/${opId}/public-translation`, {
          ...payload,
          isSimpleChange,
        })
      } else {
        await api.put(`/api/v1/operation-info/${opId}/translation`, {
          language: tab,
          ...payload,
        })
      }
      toast.success(`${langLabel(tab)} 내용이 저장되었습니다.`)
      // 저장 성공 → 서버 기준으로 다시 불러와 재검수 알림/원본 스냅샷을 갱신한다.
      try {
        await loadLang(tab)
      } catch {
        setOriginals((prev) => ({ ...prev, [tab]: f }))
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  const showSimple = !isNew && (tab === BASE_LANGUAGE || tab === PUBLIC_LANGUAGE)
  const baseForm = forms[BASE_LANGUAGE]
  const notMatchKeys = notMatchMap[tab] ?? []

  // 재검수 필요 항목(notMatchKeys)을 각 인풋에 매핑하기 위한 헬퍼들
  const REVIEW_NOTE = '기준 언어가 변경되어 재검수가 필요합니다.'
  const notMatchSet = new Set(notMatchKeys.map((k) => k.key))
  const hasErr = (key: string) => notMatchSet.has(key)
  // 배열 필드(hashtag.0, caution.1 …) → 인덱스 집합
  const errIndexes = (prefix: string) => {
    const s = new Set<number>()
    notMatchSet.forEach((k) => {
      if (k.startsWith(`${prefix}.`)) {
        const n = Number(k.slice(prefix.length + 1))
        if (!Number.isNaN(n)) s.add(n)
      }
    })
    return s
  }
  const hashtagErr = errIndexes('hashtag')
  const cautionErr = errIndexes('caution')
  // shortDescription.0.key / shortDescription.0.value → 'i.key' / 'i.value' 집합
  const shortDescErr = new Set<string>()
  notMatchSet.forEach((k) => {
    if (k.startsWith('shortDescription.')) shortDescErr.add(k.slice('shortDescription.'.length))
  })

  return (
    <div className="page">
      <div className="page-head">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/operation-info')}>
          ← 목록
        </button>
        <h2>{isNew ? '시술 설명 등록' : '시술 설명 수정'}</h2>
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
            {!isNew && isDirty(l.value) && (
              <span title="저장하지 않은 수정 내용이 있습니다" style={{ color: 'var(--primary, #4f6bed)', marginLeft: 4 }}>
                ●
              </span>
            )}
          </button>
        ))}
      </div>
      {isNew && (
        <div className="hint" style={{ marginBottom: 12 }}>
          언어 탭별로 입력한 뒤 한 번에 등록됩니다. 기준 언어({langLabel(BASE_LANGUAGE)}) 제목은 필수입니다.
        </div>
      )}

      {tabLoading || !current ? (
        <Loading label="번역 불러오는 중…" />
      ) : (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>
            {langLabel(tab)}
            {tab === BASE_LANGUAGE ? ' (기준)' : tab === PUBLIC_LANGUAGE ? ' (공용)' : ''} 내용
            {isDirty(tab) && (
              <span className="hint" style={{ marginLeft: 8, fontWeight: 400 }}>
                · 수정 중 (저장 전)
              </span>
            )}
          </h3>

          {notMatchKeys.length > 0 && (
            <div className="alert alert-warn">
              기준 언어가 변경되어 재검수가 필요한 항목이 있습니다. 아래 빨간색으로 표시된 항목을 확인해
              주세요.
            </div>
          )}

          {tab !== BASE_LANGUAGE && baseForm && (
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
              <div style={{ fontWeight: 600 }}>{baseForm.title || '-'}</div>
              <div style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginTop: 4 }}>
                {baseForm.description || ''}
              </div>
            </div>
          )}

          <div className="field">
            <label>제목 <span className="req">*</span></label>
            <input
              className={hasErr('title') ? 'input-error' : undefined}
              value={current.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
            {hasErr('title') && <div className="field-error-note">{REVIEW_NOTE}</div>}
          </div>
          <div className="field">
            <label>설명</label>
            <textarea
              className={hasErr('description') ? 'input-error' : undefined}
              value={current.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
            {hasErr('description') && <div className="field-error-note">{REVIEW_NOTE}</div>}
          </div>
          <div className="field">
            <label>요약 정보</label>
            <div className="hint" style={{ marginBottom: 4 }}>
              상단 고정 항목은 항목명 수정·삭제가 불가하며 값만 입력합니다. (값은 비워도 등록 가능)
              필요하면 아래에서 항목을 추가할 수 있습니다.
            </div>
            <KeyValueEditor
              value={current.shortDescription}
              onChange={(v) => patch({ shortDescription: v })}
              lockedKeys={OPERATION_SHORT_DESC_KEYS[tab] ?? []}
              valuePlaceholder="시술 설명"
              errorCells={shortDescErr}
            />
            {shortDescErr.size > 0 && (
              <div className="field-error-note">{REVIEW_NOTE} (빨간 항목 확인)</div>
            )}
          </div>
          <ImagePicker value={current.image} onChange={(img) => patch({ image: img })} />
          <div className="field">
            <label>해시태그</label>
            <ChipsInput
              value={current.hashtag}
              onChange={(v) => patch({ hashtag: v })}
              placeholder="해시태그 입력 후 Enter"
              errorIndexes={hashtagErr}
            />
            {hashtagErr.size > 0 && (
              <div className="field-error-note">{REVIEW_NOTE} (빨간 항목 확인)</div>
            )}
          </div>
          <div className="field">
            <label>주의사항</label>
            <ChipsInput
              value={current.caution}
              onChange={(v) => patch({ caution: v })}
              placeholder="주의사항 입력 후 Enter"
              errorIndexes={cautionErr}
            />
            {cautionErr.size > 0 && (
              <div className="field-error-note">{REVIEW_NOTE} (빨간 항목 확인)</div>
            )}
          </div>
          <div className="field">
            <label>관리자 메모</label>
            <textarea
              className={hasErr('note') ? 'input-error' : undefined}
              value={current.note}
              style={{ minHeight: 60 }}
              onChange={(e) => patch({ note: e.target.value })}
            />
            {hasErr('note') && <div className="field-error-note">{REVIEW_NOTE}</div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {showSimple && (
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
              onClick={save}
              disabled={saving}
            >
              {saving ? <Spinner /> : isNew ? '등록' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
