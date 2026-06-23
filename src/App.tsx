import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import ProductEditPage from './pages/ProductEditPage'
import CategoriesPage from './pages/CategoriesPage'
import CategoryEditPage from './pages/CategoryEditPage'
import ProductDetailInfoPage from './pages/ProductDetailInfoPage'
import ProductDetailInfoEditPage from './pages/ProductDetailInfoEditPage'
import ImagesPage from './pages/ImagesPage'
import ProductGroupsPage from './pages/ProductGroupsPage'
import PolicyPage from './pages/PolicyPage'
import BasicPopupPage from './pages/BasicPopupPage'
import HospitalWorkTimePage from './pages/HospitalWorkTimePage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductEditPage />} />
        <Route path="/products/:id" element={<ProductEditPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/new" element={<CategoryEditPage />} />
        <Route path="/categories/:id" element={<CategoryEditPage />} />
        <Route path="/product-detail-info" element={<ProductDetailInfoPage />} />
        <Route path="/product-detail-info/new" element={<ProductDetailInfoEditPage />} />
        <Route path="/product-detail-info/:id" element={<ProductDetailInfoEditPage />} />
        <Route path="/product-groups" element={<ProductGroupsPage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/policy" element={<PolicyPage />} />
        <Route path="/basic-popup" element={<BasicPopupPage />} />
        <Route path="/hospital-work-time" element={<HospitalWorkTimePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
