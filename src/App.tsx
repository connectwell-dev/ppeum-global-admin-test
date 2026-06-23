import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import ProductEditPage from './pages/ProductEditPage'
import CategoriesPage from './pages/CategoriesPage'
import EventsPage from './pages/EventsPage'
import EventEditPage from './pages/EventEditPage'
import OperationInfoPage from './pages/OperationInfoPage'
import OperationInfoEditPage from './pages/OperationInfoEditPage'
import ImagesPage from './pages/ImagesPage'
import ProductGroupsPage from './pages/ProductGroupsPage'
import PolicyPage from './pages/PolicyPage'
import BasicPopupPage from './pages/BasicPopupPage'

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
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/new" element={<EventEditPage />} />
        <Route path="/events/:id" element={<EventEditPage />} />
        <Route path="/operation-info" element={<OperationInfoPage />} />
        <Route path="/operation-info/new" element={<OperationInfoEditPage />} />
        <Route path="/operation-info/:id" element={<OperationInfoEditPage />} />
        <Route path="/product-groups" element={<ProductGroupsPage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/policy" element={<PolicyPage />} />
        <Route path="/basic-popup" element={<BasicPopupPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
