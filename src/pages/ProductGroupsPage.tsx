import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import type { ProductGroup } from '../lib/types'
import { Modal, Empty, Loading, Spinner, confirmDelete } from '../components/ui'

interface EditState {
  id?: number
  code?: string
  name: string
}

export default function ProductGroupsPage() {
  const toast = useToast()

  const [list, setList] = useState<ProductGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const data = await api.get<ProductGroup[]>('/api/v1/product-group/list')
    setList(data)
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
  }, [])

  const openCreate = () => setEdit({ name: '' })

  const openEdit = (g: ProductGroup) => {
    setEdit({ id: g.id, code: g.code, name: g.name })
  }

  const save = async () => {
    if (!edit) return
    if (!edit.name.trim()) return toast.error('분류명을 입력하세요.')
    setSaving(true)
    try {
      const body = { name: edit.name.trim() }
      if (edit.id) {
        await api.put(`/api/v1/product-group/${edit.id}`, body)
        toast.success('수정되었습니다.')
      } else {
        await api.post('/api/v1/product-group', body)
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

  const remove = async (g: ProductGroup) => {
    if (!confirmDelete(g.name)) return
    try {
      await api.del(`/api/v1/product-group/${g.id}`)
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
        <h2>상품 그룹</h2>
        <span className="sub">엑셀 업로드 등에 사용하는 상품 분류 코드를 관리합니다.</span>
        <div className="page-head-actions">
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            + 그룹 추가
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>분류코드</th>
              <th>분류명</th>
              <th>생성일</th>
              <th>수정일</th>
              <th style={{ width: 120 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {list.map((g) => (
              <tr key={g.id}>
                <td><code>{g.code}</code></td>
                <td>{g.name}</td>
                <td>{g.createdAt?.slice(0, 10)}</td>
                <td>{g.updatedAt?.slice(0, 10)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-sm" onClick={() => openEdit(g)}>
                      수정
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(g)}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <Empty message="등록된 상품 그룹이 없습니다." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal
          title={`상품 그룹 ${edit.id ? '수정' : '추가'}`}
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEdit(null)}>
                취소
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <Spinner /> : '저장'}
              </button>
            </>
          }
        >
          {edit.id && edit.code && (
            <div className="field">
              <label>분류코드</label>
              <input value={edit.code} disabled />
              <span className="hint">코드는 자동 생성되며 수정할 수 없습니다.</span>
            </div>
          )}
          {!edit.id && (
            <div className="hint" style={{ marginBottom: 8 }}>
              분류코드는 등록 시 자동 생성됩니다. (GRP_날짜_순번)
            </div>
          )}
          <div className="field">
            <label>분류명 <span className="req">*</span></label>
            <input
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              placeholder="예: 필러 시술"
              maxLength={512}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
