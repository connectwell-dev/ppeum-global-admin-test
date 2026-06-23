import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { useLang } from '../lib/lang'
import { langLabel } from '../lib/constants'
import type { PolicyListItem, PolicyDetail } from '../lib/types'
import { Empty, Loading, Modal } from '../components/ui'

const POLICY_TYPE_LABEL: Record<string, string> = {
  terms: '이용약관',
  privacy: '개인정보처리방침',
}

export default function PolicyPage() {
  const toast = useToast()
  const { lang } = useLang()

  const [items, setItems] = useState<PolicyListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<PolicyDetail | null>(null)
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ total: number; policy: PolicyListItem[] }>(
        '/api/v1/policy-setting/list',
      )
      setItems(res.policy)
      setTotal(res.total)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '약관 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const openDetail = async (id: number) => {
    try {
      const res = await api.get<PolicyDetail>(`/api/v1/policy-setting/${id}`)
      setDetail(res)
      setEditNote(res.note)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '약관 상세를 불러오지 못했습니다.')
    }
  }

  const handleSave = async () => {
    if (!detail) return
    setSaving(true)
    try {
      await api.put(`/api/v1/policy-setting/${detail.id}`, { note: editNote })
      toast.success('저장되었습니다.')
      setDetail(null)
      load()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>약관 설정</h2>
        <span className="sub">언어별 이용약관 및 개인정보처리방침을 관리합니다.</span>
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
                <th>약관 타입</th>
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
                      {POLICY_TYPE_LABEL[item.type] ?? item.type}
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
                    <Empty message="등록된 약관이 없습니다." />
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
          title="약관 수정"
          onClose={() => setDetail(null)}
          size="lg"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setDetail(null)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>언어</label>
              <span>{langLabel(detail.language)}</span>
            </div>
            <div className="field">
              <label>약관 타입</label>
              <span>{POLICY_TYPE_LABEL[detail.type] ?? detail.type}</span>
            </div>
            <div className="field">
              <label>내용</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={15}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontSize: 14,
                }}
              />
            </div>
            {detail.createdDates.length > 0 && (
              <div className="field">
                <label>이력</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {detail.createdDates.map((d) => (
                    <span
                      key={d.id}
                      className={`badge ${d.id === detail.id ? 'badge-green' : 'badge-gray'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openDetail(d.id)}
                    >
                      {d.createdAt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
