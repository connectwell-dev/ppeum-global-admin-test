import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { imageUrl } from '../lib/image'
import { useToast } from '../lib/toast'
import type { ImageCategory, ImageItem, Paginated } from '../lib/types'
import { Modal, Empty, Loading, Pagination, confirmDelete } from '../components/ui'

const ROW_COUNT = 12

interface UploadState {
  code?: string
  imageCategoryId: string
  name: string
  file: File | null
  previewPath?: string
}

export default function ImagesPage() {
  const toast = useToast()
  const [categories, setCategories] = useState<ImageCategory[]>([])
  const [items, setItems] = useState<ImageItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPage, setTotalPage] = useState(1)
  const [categoryId, setCategoryId] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<UploadState | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await api.get<Paginated<ImageItem>>('/api/v1/general/image/list', {
          page: p,
          rowCount: ROW_COUNT,
          categoryId: categoryId || undefined,
          name: keyword || undefined,
        })
        setItems(res.data)
        setTotal(res.total)
        setTotalPage(res.totalPage)
        setPage(res.page)
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '이미지를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    },
    [categoryId, keyword, toast],
  )

  useEffect(() => {
    api
      .get<ImageCategory[]>('/api/v1/general/image-category/list')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

  const openCreate = () =>
    setEdit({
      imageCategoryId: categories[0] ? String(categories[0].id) : '',
      name: '',
      file: null,
    })

  const openEdit = (item: ImageItem) =>
    setEdit({
      code: item.code,
      imageCategoryId: categoryId || (categories[0] ? String(categories[0].id) : ''),
      name: item.name,
      file: null,
      previewPath: item.path,
    })

  const save = async () => {
    if (!edit) return
    if (!edit.name.trim()) return toast.error('이미지명을 입력하세요.')
    if (!edit.imageCategoryId) return toast.error('분류를 선택하세요.')
    if (!edit.code && !edit.file) return toast.error('이미지 파일을 선택하세요.')

    const form = new FormData()
    if (edit.file) form.append('file', edit.file)
    form.append('imageCategoryId', edit.imageCategoryId)
    form.append('name', edit.name.trim())

    setSaving(true)
    try {
      if (edit.code) {
        await api.upload('PUT', `/api/v1/general/image/${edit.code}`, form)
        toast.success('수정되었습니다.')
      } else {
        await api.upload('POST', '/api/v1/general/image', form)
        toast.success('등록되었습니다.')
      }
      setEdit(null)
      load(edit.code ? page : 1)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item: ImageItem) => {
    if (!confirmDelete(item.name)) return
    try {
      await api.del(`/api/v1/general/image/${item.code}`)
      toast.success('삭제되었습니다.')
      load(page)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>이미지</h2>
        <span className="sub">상품·이벤트·시술 설명에 사용할 이미지를 관리합니다.</span>
        <div className="page-head-actions">
          <button className="btn btn-primary" onClick={openCreate}>
            + 이미지 등록
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="field">
          <label>분류</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">전체</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>이미지명</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
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
      ) : items.length === 0 ? (
        <div className="card">
          <Empty message="등록된 이미지가 없습니다." />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 14,
          }}
        >
          {items.map((img) => (
            <div className="card" key={img.code}>
              <div
                style={{
                  height: 130,
                  background: 'var(--surface-2)',
                  borderRadius: '10px 10px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {img.path ? (
                  <img
                    src={imageUrl(img.path)}
                    alt={img.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                ) : (
                  <span style={{ color: 'var(--text-faint)' }}>이미지 없음</span>
                )}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{img.name}</div>
                <div className="hint" style={{ marginBottom: 10 }}>
                  {img.code}
                </div>
                <div className="row-actions">
                  <button className="btn btn-sm" onClick={() => openEdit(img)}>
                    수정
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(img)}>
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <Pagination page={page} totalPage={totalPage} total={total} onChange={load} />
      )}

      {edit && (
        <Modal
          title={edit.code ? '이미지 수정' : '이미지 등록'}
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
          <div className="field">
            <label>
              분류 <span className="req">*</span>
            </label>
            <select
              value={edit.imageCategoryId}
              onChange={(e) => setEdit({ ...edit, imageCategoryId: e.target.value })}
            >
              <option value="">선택</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>
              이미지명 <span className="req">*</span>
            </label>
            <input
              value={edit.name}
              maxLength={50}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              placeholder="이미지명 (최대 50자)"
            />
          </div>
          <div className="field">
            <label>
              파일 {!edit.code && <span className="req">*</span>}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => setEdit({ ...edit, file: e.target.files?.[0] ?? null })}
            />
            <div className="hint">jpeg / png / gif / webp · 최대 10MB</div>
            {edit.code && !edit.file && (
              <div className="hint">파일 미선택 시 기존 이미지가 유지됩니다.</div>
            )}
          </div>
          {(edit.file || edit.previewPath) && (
            <img
              src={edit.file ? URL.createObjectURL(edit.file) : imageUrl(edit.previewPath)}
              alt="미리보기"
              style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }}
            />
          )}
        </Modal>
      )}
    </div>
  )
}
