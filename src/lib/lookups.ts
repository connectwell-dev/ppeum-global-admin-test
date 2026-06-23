import { api } from './api'
import type { ProductDetailInfoListItem, ProductGroup, Paginated } from './types'

export interface ProductDetailInfoOption {
  id: number
  title: string
}

export async function loadProductDetailInfoOptions(): Promise<ProductDetailInfoOption[]> {
  try {
    const res = await api.get<Paginated<ProductDetailInfoListItem>>('/api/v1/product-detail-info/list', {
      page: 1,
      rowCount: 200,
    })
    return res.data.map((o) => ({ id: o.id, title: o.title }))
  } catch {
    return []
  }
}

export async function loadProductGroups(): Promise<ProductGroup[]> {
  try {
    return await api.get<ProductGroup[]>('/api/v1/product-group/list')
  } catch {
    return []
  }
}
