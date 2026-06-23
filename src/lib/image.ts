import { API_BASE_URL } from './api'

// 이미지 path 를 화면에 표시할 수 있는 완전한 URL 로 변환
export function imageUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return API_BASE_URL + (path.startsWith('/') ? '' : '/') + path
}
