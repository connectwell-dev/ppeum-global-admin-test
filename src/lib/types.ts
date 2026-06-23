// API 응답 래퍼
export interface ApiSuccess<T> {
  success: true
  data: T
  caToken?: string
}

export interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    options?: {
      messageDetail?: string
      field?: string
      fieldMessage?: string
    }
  }
}

export interface Paginated<T> {
  total: number
  page: number
  totalPage: number
  data: T[]
}

// enum 들
export type Language = 'ja' | 'ko' | 'zhCN' | 'zhTW' | 'en' | 'th' | 'vi' | 'ru'
export type WeekDayType = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type ProductCategoryType = 'general' | 'promotion'
export type GeneralImageType = 'product_detail_info' | 'event' | 'product'
export type Platform = 'admin' | 'user'

export interface KeyValue {
  key: string
  value: string
}

export interface NotMatchKey {
  key: string
  message: string
}

export interface ImageRef {
  code: string
  name: string
  path: string
}

// 인증
export interface LoginData {
  accessToken: string
  refreshToken: string
}

export interface MeData {
  id: number
  loginId: string
  name: string
  employeeType: string
  employmentStatus: string
  platform: string
  rankId: number | null
  rankName: string | null
  deptName: string | null
  email: string | null
  phoneNumber: string | null
  isResetPassword: boolean
  permission: Record<string, unknown>
}

// 이미지
export interface ImageItem {
  code: string
  name: string
  path: string
  createdAt: string
  updatedAt: string
}

export interface ImageCategory {
  id: number
  name: string
  type: GeneralImageType | null
}

// 상품
export interface ProductListItem {
  id: number
  code: string
  name: string
  productPrice: number
  eventPrice: number | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  productGroupId: number | null
  notInputLanguages: Language[]
  createdAt: string
  updatedAt: string
}

export interface ProductDetail extends ProductListItem {
  productName: string
  productDescription: string | null
  image: ImageRef | null
  isView: boolean
  productDetailInfoId: number | null
  productDetailInfoTitle: string | null
}

export interface TranslationView {
  name: string
  originName: string
  description: string
  originDescription: string
  image: ImageRef | null
  originImage: ImageRef | null
  isView: boolean
  notMatchKeys: NotMatchKey[]
}

// 카테고리
export interface CategoryListItem {
  id: number
  code: string
  order: number
  name: string
  isActive: boolean
  categoryType: ProductCategoryType
  startDate: string | null
  endDate: string | null
  reservationStartDate: string | null
  reservationEndDate: string | null
  weekDay: WeekDayType[]
  notInputLanguages: Language[]
  createdAt: string
}

export interface CategoryDetail {
  id: number
  code: string
  name: string
  image: ImageRef | null
  isActive: boolean
  categoryType: ProductCategoryType
  startDate: string | null
  endDate: string | null
  reservationStartDate: string | null
  reservationEndDate: string | null
  weekDay: WeekDayType[]
  products: CategoryProductItem[]
  createdAt: string
  updatedAt: string
}

export interface CategoryProduct {
  productId: number
  eventPrice: number | null
  eventDiscountPercent: number | null
  order: number
  name: string
  categoryName: string
  productPrice: number
}

export interface CategoryProductItem {
  productId: number
  name: string
  productPrice: number
  eventPrice: number | null
  promotionPrice: number | null
  eventDiscountPercent: number
  order: number
}

export interface CategoryTranslationView {
  name: string
  originName: string
  image: ImageRef | null
  originImage: ImageRef | null
  isView: boolean
  products: CategoryProductItem[]
  notMatchKeys: NotMatchKey[]
}

// 상품 그룹
export interface ProductGroup {
  id: number
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

// 약관
export type PolicyType = 'terms' | 'privacy'

export interface PolicyCategoryItem {
  id: number
  language: Language
  type: PolicyType
}

export interface PolicyItem {
  id: number
  note: string
  createdAt: string
}

export interface PolicyCategoryDetail {
  id: number
  language: Language
  type: PolicyType
  policies: PolicyItem[]
}

// 기본 팝업
export type PopupBasicType = 'pc' | 'mobile'

export interface PopupBasicCategoryItem {
  id: number
  language: Language
  type: PopupBasicType
}

export interface PopupBasicItem {
  id: number
  startAt: string
  startTime: string
  endAt: string
  endTime: string
  createdAt: string
  images: { path: string }[]
}

export interface PopupBasicCategoryDetail {
  id: number
  language: Language
  type: PopupBasicType
  popupBasics: PopupBasicItem[]
}

// 상세페이지 설명
// 상세페이지
export interface ProductDetailInfoListItem {
  id: number
  code: string
  title: string
  hashtag: string[]
  note: string | null
  notInputLanguages: Language[]
  createdAt: string
  updatedAt: string
}

export interface ProductDetailInfoDetail {
  id: number
  code: string
  title: string | null
  description: string | null
  shortDescription: KeyValue[]
  image: ImageRef | null
  hashtag: string[]
  caution: string[]
  note: string | null
  isMatch: boolean
  lastChangedAt: string
  createdAt: string
  updatedAt: string
  notMatchKeys: NotMatchKey[]
}
