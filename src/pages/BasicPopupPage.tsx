import { useEffect, useState, useCallback } from 'react'
import { api, API_BASE_URL, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { useLang } from '../lib/lang'
import { langLabel } from '../lib/constants'
import type { BasicPopupListItem, BasicPopupDetail } from '../lib/types'
import { Empty, Loading, Modal } from '../components/ui'

const POPUP_TYPE_LABEL: Record<string, string> = {
  pc: 'PC',
  mobile: '모바일',
}

export default function BasicPopupPage() {
  const toast = useToast()
  const { lang } = useLang()

  const [items, setItems] = useState<BasicPopupListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<BasicPopupDetail | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<BasicPopupListItem[]>('/api/v1/popup-setting/basic/list')
      setItems(res)
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

  const openDetail = async (id: number) => {
    try {
      const res = await api.get<BasicPopupDetail>(`/api/v1/popup-setting/basic/${id}`)
      setDetail(res)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '기본 팝업 상세를 불러오지 못했습니다.')
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
                <tr key={item.id} className="clickable" onClick={() => openDetail(item.id)}>
                  <td>{item.id}</td>
                  <td>{langLabel(item.language)}</td>
                  <td>
                    <span className="badge badge-gray">
                      {POPUP_TYPE_LABEL[item.type] ?? item.type}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm" onClick={() => openDetail(item.id)}>
                      상세
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
          <span className="info">총 {items.length}건</span>
        </div>
      )}

      {detail && (
        <Modal title="기본 팝업 상세" onClose={() => setDetail(null)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>언어</label>
              <span>{langLabel(detail.language)}</span>
            </div>
            <div className="field">
              <label>타입</label>
              <span>{POPUP_TYPE_LABEL[detail.type] ?? detail.type}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>시작일</label>
                <span>{detail.startAt}</span>
              </div>
              <div className="field">
                <label>시작시간</label>
                <span>{detail.startTime}</span>
              </div>
              <div className="field">
                <label>종료일</label>
                <span>{detail.endAt}</span>
              </div>
              <div className="field">
                <label>종료시간</label>
                <span>{detail.endTime}</span>
              </div>
            </div>
            {detail.images.length > 0 && (
              <div className="field">
                <label>이미지</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {detail.images.map((img, i) => (
                    <img
                      key={i}
                      src={`${API_BASE_URL}${img.path}`}
                      alt={`팝업 이미지 ${i + 1}`}
                      style={{
                        maxWidth: 200,
                        maxHeight: 200,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
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
