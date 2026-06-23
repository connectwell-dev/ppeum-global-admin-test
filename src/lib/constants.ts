import type {
  Language,
  ProductEventType,
  WeekDayType,
} from './types'

export const BASE_LANGUAGE: Language = 'ko' // 기준 언어
export const PUBLIC_LANGUAGE: Language = 'ko' // 공용 언어 (이 프로젝트는 기준=공용=ko)

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'ja', label: '일본어' },
  { value: 'zhCN', label: '중국어 간체' },
  { value: 'zhTW', label: '중국어 번체' },
  { value: 'en', label: '영어' },
  { value: 'th', label: '태국어' },
  { value: 'vi', label: '베트남어' },
  { value: 'ru', label: '러시아어' },
]

// API 언어 코드는 Prisma Language enum 표기(zhCN / zhTW)로 통일되어 있습니다.
// 구버전 데이터(zhCn / zhTw)가 섞여도 라벨을 찾도록 대소문자 무시 매칭한다.
export const langLabel = (lang: Language | string) => {
  const target = String(lang).toLowerCase()
  return LANGUAGES.find((l) => l.value.toLowerCase() === target)?.label ?? lang
}

// 기타언어 (기준/공용 제외)
const RESERVED_LANGUAGES = new Set<Language>([BASE_LANGUAGE, PUBLIC_LANGUAGE])
export const OTHER_LANGUAGES: Language[] = LANGUAGES.map((l) => l.value).filter(
  (l) => !RESERVED_LANGUAGES.has(l),
)

export const EVENT_TYPES: { value: ProductEventType; label: string }[] = [
  { value: 'general', label: '일반' },
  { value: 'promotion', label: '프로모션' },
]

// 시술 설명 요약(shortDescription) 언어별 고정 키 — 서버 검증과 동일해야 함
export const OPERATION_SHORT_DESC_KEYS: Record<Language, string[]> = {
  ja: ['麻酔時間', '手術時間', '回復期間', '持続期間', '再手術周期'],
  ko: ['마취시간', '시술시간', '회복기간', '유지시간', '재시술주기'],
  en: ['Anesthesia time', 'Surgery time', 'Recovery period', 'Duration', 'Reoperation cycle'],
  zhCN: ['麻醉时间', '手术时间', '恢复期', '持续时间', '再手术周期'],
  zhTW: ['麻醉時間', '手術時間', '回復期間', '持續時間', '再手術周期'],
  th: ['ระยะเวลาพักร่าง', 'ระยะเวลาการผ่อนคลาย', 'ระยะเวลาการฟื้นฟู', 'ระยะเวลาการฟื้นฟู', 'ระยะเวลาการฟื้นฟู'],
  vi: ['thời gian thuốc giấu', 'thời gian phẫu thuật', 'thời gian phục hồi', 'thời gian duy trì', 'thời gian phẫu thuật lại'],
  ru: ['время анестезии', 'время операции', 'время восстановления', 'время сохранения', 'время операции снова'],
}

export const WEEK_DAYS: { value: WeekDayType; label: string }[] = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
]
