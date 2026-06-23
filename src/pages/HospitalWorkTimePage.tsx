import { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from '../lib/toast'
import { Loading } from '../components/ui'

const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const DAY_LABEL: Record<string, string> = {
  sun: '일', mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토',
}
const DAY_LABELS_KR = ['일', '월', '화', '수', '목', '금', '토']

const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${m}`)
  }
}

function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let cur = sh * 60 + sm
  const endMin = eh * 60 + em
  while (cur < endMin) {
    const hh = String(Math.floor(cur / 60)).padStart(2, '0')
    const mm = String(cur % 60).padStart(2, '0')
    slots.push(`${hh}:${mm}`)
    cur += 30
  }
  return slots
}

function pad2(n: number) { return String(n).padStart(2, '0') }
function fmtDate(y: number, m: number, d: number) { return `${y}-${pad2(m)}-${pad2(d)}` }

interface TimeRange { startTime: string; endTime: string }
interface WeeklyDayData {
  id: number | null
  isTreatment: boolean
  weeklyTime: TimeRange | null
  lunchTime: TimeRange | null
}
type WeeklyData = Record<(typeof DAY_ORDER)[number], WeeklyDayData>

interface ClosedDateListItem { id: number; date: string }
interface ClosedDateDetail { id?: number; date: string; closedTime: Record<string, boolean> | null }

const defaultDay = (): WeeklyDayData => ({ id: null, isTreatment: true, weeklyTime: null, lunchTime: null })

export default function HospitalWorkTimePage() {
  const toast = useToast()

  // --- 진료시간 설정 ---
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null)
  const [weeklyLoading, setWeeklyLoading] = useState(true)
  const [weeklySaving, setWeeklySaving] = useState(false)

  // --- 일별 휴진 ---
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)
  const [closedDates, setClosedDates] = useState<ClosedDateListItem[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [closedTime, setClosedTime] = useState<Record<string, boolean>>({})
  const [closedSaving, setClosedSaving] = useState(false)

  const loadWeekly = useCallback(async () => {
    setWeeklyLoading(true)
    try {
      const res = await api.get<WeeklyData>('/api/v1/hospital-reservation/weekly-work-time')
      setWeeklyData(res)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '진료시간을 불러오지 못했습니다.')
    } finally {
      setWeeklyLoading(false)
    }
  }, [toast])

  const loadClosedDates = useCallback(async (y: number, m: number) => {
    try {
      const res = await api.get<ClosedDateListItem[]>('/api/v1/hospital-reservation/closed-date/list', { year: y, month: m })
      setClosedDates(Array.isArray(res) ? res : [])
    } catch {
      setClosedDates([])
    }
  }, [])

  const loadClosedDetail = useCallback(async (date: string) => {
    try {
      const res = await api.get<ClosedDateDetail>('/api/v1/hospital-reservation/closed-date/detail', { date })
      setClosedTime(res.closedTime ?? {})
    } catch {
      setClosedTime({})
    }
  }, [])

  useEffect(() => {
    loadWeekly()
    loadClosedDates(viewYear, viewMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { loadClosedDates(viewYear, viewMonth) }, [viewYear, viewMonth, loadClosedDates])
  useEffect(() => { if (selectedDate) loadClosedDetail(selectedDate) }, [selectedDate, loadClosedDetail])

  // --- 진료시간 핸들러 ---
  const updateDay = (day: string, patch: Partial<WeeklyDayData>) => {
    if (!weeklyData) return
    setWeeklyData({ ...weeklyData, [day]: { ...weeklyData[day as keyof WeeklyData], ...patch } })
  }
  const updateWeeklyTime = (day: string, field: 'startTime' | 'endTime', value: string) => {
    if (!weeklyData) return
    const cur = weeklyData[day as keyof WeeklyData]
    const wt = cur.weeklyTime ?? { startTime: '', endTime: '' }
    updateDay(day, { weeklyTime: { ...wt, [field]: value } })
  }
  const updateLunchTime = (day: string, field: 'startTime' | 'endTime', value: string) => {
    if (!weeklyData) return
    const cur = weeklyData[day as keyof WeeklyData]
    const lt = cur.lunchTime ?? { startTime: '', endTime: '' }
    updateDay(day, { lunchTime: { ...lt, [field]: value } })
  }
  const handleWeeklySave = async () => {
    if (!weeklyData) return
    setWeeklySaving(true)
    try {
      const payload = DAY_ORDER.map((day) => {
        const d = weeklyData[day]
        return {
          weekDayType: day,
          isTreatment: d.isTreatment,
          weeklyTime: d.weeklyTime?.startTime && d.weeklyTime?.endTime ? d.weeklyTime : undefined,
          lunchTime: d.lunchTime?.startTime && d.lunchTime?.endTime ? d.lunchTime : undefined,
        }
      })
      await api.post('/api/v1/hospital-reservation/weekly-work-time', { data: payload })
      toast.success('진료시간이 저장되었습니다.')
      await loadWeekly()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setWeeklySaving(false)
    }
  }

  // --- 휴진 핸들러 ---
  const prevMonth = () => { if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12) } else setViewMonth(viewMonth - 1) }
  const nextMonth = () => { if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1) } else setViewMonth(viewMonth + 1) }

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  const closedDateSet = new Set(closedDates.map((c) => c.date))
  const todayStr = fmtDate(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const getTimeSlotsForDate = (dateStr: string): string[] => {
    if (!weeklyData) return []
    const dow = new Date(dateStr).getDay()
    const dayKey = DAY_ORDER[dow]
    const day = weeklyData[dayKey]
    if (!day?.weeklyTime || !day.isTreatment) return []
    return generateTimeSlots(day.weeklyTime.startTime, day.weeklyTime.endTime)
  }
  const timeSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : []
  const toggleTime = (time: string) => { setClosedTime((prev) => ({ ...prev, [time]: !prev[time] })) }

  const handleClosedSave = async () => {
    if (!selectedDate) return
    setClosedSaving(true)
    try {
      const payload: Record<string, boolean> = {}
      for (const t of timeSlots) payload[t] = !!closedTime[t]
      await api.post('/api/v1/hospital-reservation/closed-date', { date: selectedDate, closedTime: payload })
      toast.success('저장되었습니다.')
      await loadClosedDates(viewYear, viewMonth)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장에 실패했습니다.')
    } finally {
      setClosedSaving(false)
    }
  }

  if (weeklyLoading) return <Loading />

  return (
    <div className="page">
      <div className="page-head">
        <h2>병원 예약 설정</h2>
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ====== 왼쪽: 진료시간 설정 ====== */}
        <div style={{ flex: '1 1 480px', minWidth: 400 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>진료시간 설정</h3>

          {weeklyData && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DAY_ORDER.map((day, i) => {
                  const d = weeklyData[day] ?? defaultDay()
                  const bg = i % 2 === 0 ? '#f7fafc' : '#ffffff'
                  return (
                    <div
                      key={day}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: bg,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ width: 32, fontWeight: 700, fontSize: 16, textAlign: 'center', flexShrink: 0 }}>
                        {DAY_LABEL[day]}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 60, fontSize: 13, color: '#718096', flexShrink: 0 }}>진료시간 :</span>
                          <select value={d.weeklyTime?.startTime ?? ''} onChange={(e) => updateWeeklyTime(day, 'startTime', e.target.value)} style={{ minWidth: 80, fontSize: 13 }}>
                            <option value="">선택</option>
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span style={{ color: '#a0aec0', fontSize: 13 }}>~</span>
                          <select value={d.weeklyTime?.endTime ?? ''} onChange={(e) => updateWeeklyTime(day, 'endTime', e.target.value)} style={{ minWidth: 80, fontSize: 13 }}>
                            <option value="">선택</option>
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 60, fontSize: 13, color: '#718096', flexShrink: 0 }}>점심시간 :</span>
                          <select value={d.lunchTime?.startTime ?? ''} onChange={(e) => updateLunchTime(day, 'startTime', e.target.value)} style={{ minWidth: 80, fontSize: 13 }}>
                            <option value="">선택</option>
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span style={{ color: '#a0aec0', fontSize: 13 }}>~</span>
                          <select value={d.lunchTime?.endTime ?? ''} onChange={(e) => updateLunchTime(day, 'endTime', e.target.value)} style={{ minWidth: 80, fontSize: 13 }}>
                            <option value="">선택</option>
                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ width: 60, flexShrink: 0, textAlign: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13 }}>
                          <input type="checkbox" checked={d.isTreatment} onChange={(e) => updateDay(day, { isTreatment: e.target.checked })} />
                          진료
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <button className="btn btn-primary" onClick={handleWeeklySave} disabled={weeklySaving} style={{ minWidth: 100 }}>
                  {weeklySaving ? '저장 중…' : '등록'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ====== 오른쪽: 일별 휴진시간 ====== */}
        <div style={{ flex: '1 1 480px', minWidth: 400 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>일별 휴진시간 설정</h3>

          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* 달력 */}
            <div style={{ minWidth: 300, flex: '1 1 300px', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={prevMonth} style={{ fontSize: 16, fontWeight: 700 }}>«</button>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{viewYear} {viewMonth}월</span>
                <button className="btn btn-ghost btn-sm" onClick={nextMonth} style={{ fontSize: 16, fontWeight: 700 }}>»</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
                {DAY_LABELS_KR.map((l, i) => (
                  <div key={l} style={{ padding: '6px 0', fontWeight: 600, fontSize: 13, color: i === 0 ? '#e53e3e' : i === 6 ? '#3182ce' : 'inherit' }}>{l}</div>
                ))}
                {calendarCells.map((d, i) => {
                  if (d === null) return <div key={`e${i}`} style={{ padding: '8px 0' }} />
                  const dateStr = fmtDate(viewYear, viewMonth, d)
                  const isToday = dateStr === todayStr
                  const isClosed = closedDateSet.has(dateStr)
                  const isSelected = dateStr === selectedDate
                  const dow = (firstDay + d - 1) % 7

                  let bg = 'transparent'
                  let color = dow === 0 ? '#e53e3e' : dow === 6 ? '#3182ce' : 'inherit'
                  let fw = 400
                  if (isClosed && !isSelected && !isToday) { bg = '#ed8936'; color = '#fff'; fw = 700 }
                  if (isToday) { bg = '#3182ce'; color = '#fff'; fw = 700 }
                  if (isSelected && !isToday) { bg = '#e2e8f0'; color = '#1a202c'; fw = 700 }

                  return (
                    <div
                      key={d}
                      onClick={() => setSelectedDate(dateStr)}
                      style={{
                        cursor: 'pointer', borderRadius: '50%', width: 36, height: 36,
                        margin: '2px auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: bg, color, fontWeight: fw, fontSize: 14, transition: 'background .15s',
                      }}
                    >{d}</div>
                  )
                })}
              </div>
            </div>

            {/* 시간 선택 */}
            <div style={{ flex: '1 1 200px', minWidth: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
              {!selectedDate ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, margin: 0, textAlign: 'center', paddingTop: 40 }}>날짜를 선택해주세요.</p>
              ) : timeSlots.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, margin: 0, textAlign: 'center', paddingTop: 40 }}>진료가 없는 날입니다.</p>
              ) : (
                <>
                  <div style={{ borderRadius: 8, maxHeight: 380, overflowY: 'auto' }}>
                    {timeSlots.map((t) => (
                      <div
                        key={t}
                        onClick={() => toggleTime(t)}
                        style={{
                          padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                          background: closedTime[t] ? '#fed7d7' : 'transparent',
                          color: closedTime[t] ? '#c53030' : 'inherit',
                          fontWeight: closedTime[t] ? 600 : 400, fontSize: 16,
                          transition: 'background .15s', userSelect: 'none',
                        }}
                      >{t}</div>
                    ))}
                  </div>
                  <button className="btn btn-primary" onClick={handleClosedSave} disabled={closedSaving} style={{ marginTop: 16, width: '100%' }}>
                    {closedSaving ? '저장 중…' : '휴진'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
