import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { useLang } from '../lib/lang'
import { langLabel } from '../lib/constants'
import type { PolicyCategoryItem, PolicyCategoryDetail } from '../lib/types'
import { Empty, Loading, Modal } from '../components/ui'

const POLICY_TYPE_LABEL: Record<string, string> = {
  terms: '이용약관',
  privacy: '개인정보처리방침',
}

export default function PolicyPage() {
  const toast = useToast()
  const { lang } = useLang()

  const [items, setItems] = useState<PolicyCategoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<PolicyCategoryDetail | null>(null)
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ total: number; policyCategory: PolicyCategoryItem[] }>(
        '/api/v1/policy-setting/list',
      )
      setItems(res.policyCategory)
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

  const openDetail = async (categoryId: number) => {
    try {
      const res = await api.get<PolicyCategoryDetail>(`/api/v1/policy-setting/category/${categoryId}`)
      setDetail(res)
      if (res.policies.length > 0) {
        setSelectedPolicyId(res.policies[0].id)
        setEditNote(res.policies[0].note)
      } else {
        setSelectedPolicyId(null)
        setEditNote('')
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '약관 상세를 불러오지 못했습니다.')
    }
  }

  const selectPolicy = (policyId: number) => {
    const policy = detail?.policies.find((p) => p.id === policyId)
    if (policy) {
      setSelectedPolicyId(policy.id)
      setEditNote(policy.note)
    }
  }

  const handleSave = async () => {
    if (!selectedPolicyId) return
    setSaving(true)
    try {
      await api.put(`/api/v1/policy-setting/${selectedPolicyId}`, { note: editNote })
      toast.success('저장되었습니다.')
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
            selectedPolicyId ? (
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
              <label>약관 타입</label>
              <span>{POLICY_TYPE_LABEL[detail.type] ?? detail.type}</span>
            </div>
            {detail.policies.length > 0 && (
              <div className="field">
                <label>과거내역</label>
                <select
                  value={selectedPolicyId ?? ''}
                  onChange={(e) => selectPolicy(Number(e.target.value))}
                >
                  {detail.policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.createdAt}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedPolicyId && (
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
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
