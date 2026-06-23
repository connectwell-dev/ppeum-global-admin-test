import { useEffect, useState, useCallback, useRef } from 'react'
import { api, IMAGE_BASE_URL, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { useLang } from '../lib/lang'
import { langLabel } from '../lib/constants'
import type { PopupMainCategoryItem, PopupMainCategoryDetail, PopupMainItem } from '../lib/types'
import { Empty, Loading, Modal } from '../components/ui'

const POPUP_TYPE_LABEL: Record<string, string> = {
  pc: 'PC',
  mobile: '모바일',
}

interface EditState {
  startAt: string
  startTime: string
  endAt: string
  endTime: string
  title: string
  link: string
  isNewTab: boolean
  previewFile: File | null
  previewUrl: string | null
}

function initEdit(p: PopupMainItem): EditState {
  return {
    startAt: p.startAt,
    startTime: p.startTime,
    endAt: p.endAt,
    endTime: p.endTime,
    title: p.title,
    link: p.link ?? '',
    isNewTab: p.isNewTab,
    previewFile: null,
    previewUrl: null,
  }
}

export default function MainPopupPage() {
  const toast = useToast()
  const { lang } = useLang()

  const [items, setItems] = useState<PopupMainCategoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<PopupMainCategoryDetail | null>(null)
  const [editMap, setEditMap] = useState<Record<number, EditState>>({})
  const [saving, setSaving] = useState(false)
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const dragItemRef = useRef<number | null>(null)
  const dragOverItemRef = useRef<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ total: number; popupMainCategory: PopupMainCategoryItem[] }>('/api/v1/popup-setting/main/list')
      setItems(res.popupMainCategory)
      setTotal(res.total)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '메인 팝업 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const openDetail = async (categoryId: number) => {
    try {
      const res = await api.get<PopupMainCategoryDetail>(`/api/v1/popup-setting/main/category/${categoryId}`)
      setDetail(res)
      const map: Record<number, EditState> = {}
      res.popupMains.forEach((p) => { map[p.id] = initEdit(p) })
      setEditMap(map)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '메인 팝업 상세를 불러오지 못했습니다.')
    }
  }

  const updateEdit = (id: number, patch: Partial<EditState>) => {
    setEditMap((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const handleFileSelect = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    updateEdit(id, { previewFile: file, previewUrl: URL.createObjectURL(file) })
  }

  const resetEdit = (p: PopupMainItem) => {
    setEditMap((prev) => ({ ...prev, [p.id]: initEdit(p) }))
    const ref = fileRefs.current[p.id]
    if (ref) ref.value = ''
  }

  const handleSaveAll = async () => {
    if (!detail) return
    setSaving(true)
    try {
      const reorderItems = detail.popupMains.map((p, i) => ({ id: p.id, order: i + 1 }))
      await api.patch('/api/v1/popup-setting/main/reorder', { items: reorderItems })

      for (const p of detail.popupMains) {
        const edit = editMap[p.id]
        if (!edit) continue

        if (edit.previewFile) {
          const imgForm = new FormData()
          imgForm.append('file', edit.previewFile)
          await api.upload('POST', `/api/v1/popup-setting/main/${p.id}/image`, imgForm)
        }

        const form = new FormData()
        form.append('startAt', edit.startAt)
        form.append('startTime', edit.startTime)
        form.append('endAt', edit.endAt)
        form.append('endTime', edit.endTime)
        form.append('title', edit.title)
        form.append('link', edit.link)
        form.append('isNewTab', String(edit.isNewTab))
        await api.upload('PUT', `/api/v1/popup-setting/main/${p.id}`, form)
      }

      toast.success('전체 저장되었습니다.')
      await openDetail(detail.id)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDragStart = (idx: number) => {
    dragItemRef.current = idx
  }

  const handleDragEnter = (idx: number) => {
    dragOverItemRef.current = idx
    setDragOverIdx(idx)
  }

  const handleDragEnd = () => {
    setDragOverIdx(null)
    if (!detail) return
    const fromIdx = dragItemRef.current
    const toIdx = dragOverItemRef.current
    dragItemRef.current = null
    dragOverItemRef.current = null

    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return

    const reordered = [...detail.popupMains]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    setDetail({ ...detail, popupMains: reordered })
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>메인 팝업 설정</h2>
        <span className="sub">언어별 메인 팝업을 관리합니다.</span>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>언어</th>
                <th>타입</th>
                <th style={{ width: 100 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{langLabel(item.language)}</td>
                  <td>
                    <span className="badge badge-gray">
                      {POPUP_TYPE_LABEL[item.type] ?? item.type}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm" onClick={() => openDetail(item.id)}>
                      수정
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <Empty message="등록된 메인 팝업이 없습니다." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (
        <div className="pagination">
          <span className="info">총 {total}건</span>
        </div>
      )}

      {detail && (
        <Modal
          title="메인 팝업 수정"
          onClose={() => setDetail(null)}
          size="xl"
          footer={
            <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving} style={{ minWidth: 120 }}>
              {saving ? '저장 중…' : '전체 저장'}
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div className="field">
              <label>언어</label>
              <span>{langLabel(detail.language)}</span>
            </div>
            <div className="field">
              <label>타입</label>
              <span>{POPUP_TYPE_LABEL[detail.type] ?? detail.type}</span>
            </div>
          </div>

          {detail.popupMains.length === 0 && (
            <Empty message="등록된 메인 팝업이 없습니다." />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {detail.popupMains.map((p, idx) => {
              const edit = editMap[p.id]
              if (!edit) return null
              const showExistingImg = !edit.previewUrl && p.images.length > 0
              const isDragOver = dragOverIdx === idx

              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={handleDragEnd}
                  style={{
                    border: isDragOver ? '2px dashed var(--primary, #4f46e5)' : '1px solid var(--border)',
                    borderRadius: 8,
                    padding: 16,
                    background: isDragOver ? '#eef2ff' : '#fafafa',
                    transition: 'background 0.15s, border 0.15s',
                    cursor: 'grab',
                  }}
                >
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {/* 드래그 핸들 + 순서 */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        flexShrink: 0,
                        paddingTop: 4,
                        userSelect: 'none',
                      }}
                    >
                      <span style={{ fontSize: 18, color: '#a0aec0', lineHeight: 1 }}>☰</span>
                      <span style={{ fontSize: 12, color: '#718096', marginTop: 4, fontWeight: 600 }}>{idx + 1}</span>
                    </div>

                    {/* 필드들 */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <input
                          ref={(el) => { fileRefs.current[p.id] = el }}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={(e) => handleFileSelect(p.id, e)}
                          style={{ display: 'none' }}
                        />
                        <button className="btn btn-sm" onClick={() => fileRefs.current[p.id]?.click()} style={{ marginBottom: 8 }}>
                          이미지 업로드
                        </button>
                        {edit.previewFile && (
                          <span style={{ fontSize: 12, color: '#718096', marginLeft: 8 }}>{edit.previewFile.name}</span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#718096' }}>시작일</span>
                        <input type="date" value={edit.startAt} onChange={(e) => updateEdit(p.id, { startAt: e.target.value })} />
                        <input type="time" value={edit.startTime} onChange={(e) => updateEdit(p.id, { startTime: e.target.value })} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#718096' }}>종료일</span>
                        <input type="date" value={edit.endAt} onChange={(e) => updateEdit(p.id, { endAt: e.target.value })} />
                        <input type="time" value={edit.endTime} onChange={(e) => updateEdit(p.id, { endTime: e.target.value })} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#718096' }}>타이틀</span>
                        <input type="text" value={edit.title} onChange={(e) => updateEdit(p.id, { title: e.target.value })} placeholder="제목을 입력하세요." />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#718096' }}>링크</span>
                        <input type="text" value={edit.link} onChange={(e) => updateEdit(p.id, { link: e.target.value })} placeholder="홈페이지 링크를 입력하세요." />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#718096' }}>새창여부</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={edit.isNewTab} onChange={(e) => updateEdit(p.id, { isNewTab: e.target.checked })} />
                          {edit.isNewTab ? 'Y' : 'N'}
                        </label>
                      </div>

                      <div style={{ marginTop: 4 }}>
                        <button className="btn btn-sm" onClick={() => resetEdit(p)}>내용 초기화</button>
                      </div>
                    </div>

                    {/* 이미지 미리보기 */}
                    <div style={{ width: 160, flexShrink: 0 }}>
                      {edit.previewUrl && (
                        <img src={edit.previewUrl} alt="미리보기" style={{ width: '100%', borderRadius: 8, border: '2px solid var(--primary, #4f46e5)' }} />
                      )}
                      {showExistingImg && (
                        <img src={`${IMAGE_BASE_URL}/${p.images[0].path}`} alt="팝업 이미지" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Modal>
      )}
    </div>
  )
}
