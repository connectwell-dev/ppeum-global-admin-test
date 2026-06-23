import { useEffect, useState, useCallback, useRef } from 'react'
import { api, IMAGE_BASE_URL, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { useLang } from '../lib/lang'
import { langLabel } from '../lib/constants'
import type { PopupBasicCategoryItem, PopupBasicCategoryDetail } from '../lib/types'
import { Empty, Loading, Modal } from '../components/ui'

const POPUP_TYPE_LABEL: Record<string, string> = {
  pc: 'PC',
  mobile: '모바일',
}

export default function BasicPopupPage() {
  const toast = useToast()
  const { lang } = useLang()

  const [items, setItems] = useState<PopupBasicCategoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<PopupBasicCategoryDetail | null>(null)
  const [selectedPopupId, setSelectedPopupId] = useState<number | null>(null)
  const [editStartAt, setEditStartAt] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndAt, setEditEndAt] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ total: number; popupBasicCategory: PopupBasicCategoryItem[] }>('/api/v1/popup-setting/basic/list')
      setItems(res.popupBasicCategory)
      setTotal(res.total)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '기본 팝업 목록을 불러오지 못했습니다.')
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
      const res = await api.get<PopupBasicCategoryDetail>(`/api/v1/popup-setting/basic/category/${categoryId}`)
      setDetail(res)
      if (res.popupBasics.length > 0) {
        const first = res.popupBasics[0]
        setSelectedPopupId(first.id)
        setEditStartAt(first.startAt)
        setEditStartTime(first.startTime)
        setEditEndAt(first.endAt)
        setEditEndTime(first.endTime)
      } else {
        setSelectedPopupId(null)
        setEditStartAt('')
        setEditStartTime('')
        setEditEndAt('')
        setEditEndTime('')
      }
      setPreviewFile(null)
      setPreviewUrl(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '기본 팝업 상세를 불러오지 못했습니다.')
    }
  }

  const selectPopup = (popupId: number) => {
    const popup = detail?.popupBasics.find((p) => p.id === popupId)
    if (popup) {
      setSelectedPopupId(popup.id)
      setEditStartAt(popup.startAt)
      setEditStartTime(popup.startTime)
      setEditEndAt(popup.endAt)
      setEditEndTime(popup.endTime)
      setPreviewFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const selectedPopup = detail?.popupBasics.find((p) => p.id === selectedPopupId) ?? null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const cancelPreview = () => {
    setPreviewFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    if (!selectedPopupId) return
    setSaving(true)
    try {
      const form = new FormData()
      form.append('startAt', editStartAt)
      form.append('startTime', editStartTime)
      form.append('endAt', editEndAt)
      form.append('endTime', editEndTime)
      if (previewFile) form.append('file', previewFile)
      await api.upload('PUT', `/api/v1/popup-setting/basic/${selectedPopupId}`, form)
      toast.success('저장되었습니다.')
      setPreviewFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (detail) await openDetail(detail.id)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>기본 팝업 설정</h2>
        <span className="sub">언어별 기본 팝업을 관리합니다.</span>
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
                    <Empty message="등록된 기본 팝업이 없습니다." />
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
          title="기본 팝업 수정"
          onClose={() => setDetail(null)}
          size="lg"
          footer={
            selectedPopupId ? (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setDetail(null)}>
                  취소
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? '저장 중…' : '저장'}
                </button>
              </div>
            ) : undefined
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>언어</label>
              <span>{langLabel(detail.language)}</span>
            </div>
            <div className="field">
              <label>타입</label>
              <span>{POPUP_TYPE_LABEL[detail.type] ?? detail.type}</span>
            </div>

            {detail.popupBasics.length > 0 && (
              <div className="field">
                <label>과거내역</label>
                <select
                  value={selectedPopupId ?? ''}
                  onChange={(e) => selectPopup(Number(e.target.value))}
                >
                  {detail.popupBasics.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.createdAt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedPopup && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>시작일</label>
                    <input type="date" value={editStartAt} onChange={(e) => setEditStartAt(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>시작시간</label>
                    <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>종료일</label>
                    <input type="date" value={editEndAt} onChange={(e) => setEditEndAt(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>종료시간</label>
                    <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
                  </div>
                </div>

                <div className="field">
                  <label>이미지</label>
                  {!previewUrl && selectedPopup.images.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <img
                        src={`${IMAGE_BASE_URL}/${selectedPopup.images[0].path}`}
                        alt="팝업 이미지"
                        style={{
                          maxWidth: 200,
                          maxHeight: 200,
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                        }}
                      />
                    </div>
                  )}

                  {previewUrl && (
                    <div style={{ marginBottom: 8 }}>
                      <img
                        src={previewUrl}
                        alt="미리보기"
                        style={{
                          maxWidth: 200,
                          maxHeight: 200,
                          borderRadius: 8,
                          border: '2px solid var(--primary, #4f46e5)',
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
                      이미지 선택
                    </button>
                    {previewFile && (
                      <>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{previewFile.name}</span>
                        <button className="btn btn-sm" onClick={cancelPreview}>
                          취소
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
