import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { useLang } from '../lib/lang'
import { LANGUAGES, BASE_LANGUAGE, langLabel } from '../lib/constants'
import type { CategoryDetail, CategoryListItem } from '../lib/types'
import { Modal, StatusBadge, Empty, Loading, confirmDelete } from '../components/ui'

interface EditState {
  id?: number
  isActive: boolean
  translations: Record<string, string>
}

export default function CategoriesPage() {
  const toast = useToast()
  const { lang } = useLang()

  const [list, setList] = useState<CategoryListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const data = await api.get<CategoryListItem[]>('/api/v1/product-category/list')
    setList(data)
    return data
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '목록을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const openCreate = () => {
    setEdit({ isActive: true, translations: {} })
  }

  const openEdit = async (id: number) => {
    try {
      const detail = await api.get<CategoryDetail>(`/api/v1/product-category/${id}`)
      const translations: Record<string, string> = {}
      detail.translations?.forEach((t) => (translations[t.language] = t.name))
      setEdit({ id, isActive: detail.isActive, translations })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '상세를 불러오지 못했습니다.')
    }
  }

  const save = async () => {
    if (!edit) return
    const translations = LANGUAGES.map((l) => l.value)
      .filter((l) => edit.translations[l]?.trim())
      .map((l) => ({ language: l, name: edit.translations[l].trim() }))
    if (!translations.some((t) => t.language === BASE_LANGUAGE)) {
      toast.error(`기준 언어(${langLabel(BASE_LANGUAGE)}) 명칭은 필수입니다.`)
      return
    }
    setSaving(true)
    try {
      const body = { isActive: edit.isActive, translations }
      if (edit.id) {
        await api.put(`/api/v1/product-category/${edit.id}`, body)
        toast.success('수정되었습니다.')
      } else {
        await api.post('/api/v1/product-category', body)
        toast.success('추가되었습니다.')
      }
      setEdit(null)
      await load()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item: CategoryListItem) => {
    if (!confirmDelete(item.name)) return
    try {
      await api.del(`/api/v1/product-category/${item.id}`)
      toast.success('삭제되었습니다.')
      await load()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '삭제에 실패했습니다.')
    }
  }

  if (loading) return <Loading />

  return (
    <div className="page">
      <div className="page-head">
        <h2>상품 분류</h2>
        <span className="sub">상품 분류와 다국어 명칭을 관리합니다.</span>
        <div className="page-head-actions">
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            + 분류 추가
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 80 }}>순서</th>
              <th>명칭</th>
              <th>상태</th>
              <th style={{ width: 120 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>{c.order}</td>
                <td>{c.name}</td>
                <td>
                  <StatusBadge active={c.isActive} />
                </td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-sm" onClick={() => openEdit(c.id)}>
                      수정
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(c)}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <Empty message="등록된 분류가 없습니다." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal
          title={`상품 분류 ${edit.id ? '수정' : '추가'}`}
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEdit(null)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                저장
              </button>
            </>
          }
        >
          <label className="check">
            <input
              type="checkbox"
              checked={edit.isActive}
              onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })}
            />
            사용함
          </label>
          <div className="hint">언어별 명칭을 입력하세요. 기준 언어는 필수입니다.</div>
          {LANGUAGES.map((l) => (
            <div className="field" key={l.value}>
              <label>
                {l.label}
                {l.value === BASE_LANGUAGE && <span className="req"> *</span>}
              </label>
              <input
                value={edit.translations[l.value] || ''}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    translations: { ...edit.translations, [l.value]: e.target.value },
                  })
                }
                placeholder={`${l.label} 명칭`}
              />
            </div>
          ))}
        </Modal>
      )}
    </div>
  )
}
