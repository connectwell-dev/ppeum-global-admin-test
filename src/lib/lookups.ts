import { api } from './api'
import type { CategoryListItem, OperationInfoListItem, Paginated } from './types'

// 상품 분류 목록 (단일 뎁스) 로드
export async function loadCategories(): Promise<CategoryListItem[]> {
  try {
    return await api.get<CategoryListItem[]>('/api/v1/product-category/list')
  } catch {
    return []
  }
}

export interface OperationInfoOption {
  id: number
  title: string
}

export async function loadOperationInfoOptions(): Promise<OperationInfoOption[]> {
  try {
    const res = await api.get<Paginated<OperationInfoListItem>>('/api/v1/operation-info/list', {
      page: 1,
      rowCount: 200,
    })
    return res.data.map((o) => ({ id: o.id, title: o.title }))
  } catch {
    return []
  }
}
