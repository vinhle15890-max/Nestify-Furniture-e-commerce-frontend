import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { AdminRoute } from '../routes/AdminRoute'
import { HomePage } from '../pages/home/HomePage'
import { CategoryPage } from '../pages/catalog/CategoryPage'
import { ProductPage } from '../pages/product/ProductPage'
import { CartPage } from '../pages/cart/CartPage'
import { WishlistPage } from '../pages/wishlist/WishlistPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import { AccountPage } from '../pages/account/AccountPage'
import { AddressesPage } from '../pages/account/AddressesPage'
import { CheckoutPage } from '../pages/checkout/CheckoutPage'
import { CheckoutReturnPage } from '../pages/checkout/CheckoutReturnPage'
import { OrdersPage } from '../pages/orders/OrdersPage'
import { OrderDetailPage } from '../pages/orders/OrderDetailPage'
import { AdminLayout } from '../pages/admin/AdminLayout'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminCategoriesPage } from '../pages/admin/categories/AdminCategoriesPage'
import { AdminProductsPage } from '../pages/admin/products/AdminProductsPage'
import { AdminProductEditPage } from '../pages/admin/products/AdminProductEditPage'
import { AdminOrdersPage } from '../pages/admin/orders/AdminOrdersPage'
import { AdminOrderDetailPage } from '../pages/admin/orders/AdminOrderDetailPage'
import { AdminReviewsPage } from '../pages/admin/reviews/AdminReviewsPage'
import { AdminVouchersPage } from '../pages/admin/vouchers/AdminVouchersPage'
import { AdminUsersPage } from '../pages/admin/users/AdminUsersPage'
import { AdminAuditLogsPage } from '../pages/admin/auditLogs/AdminAuditLogsPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'c/:categorySlug', element: <CategoryPage /> },
      { path: 'p/:productSlug', element: <ProductPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'account', element: <AccountPage /> },
          { path: 'account/addresses', element: <AddressesPage /> },
          { path: 'wishlist', element: <WishlistPage /> },
          { path: 'checkout', element: <CheckoutPage /> },
          { path: 'checkout/return', element: <CheckoutReturnPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:id', element: <OrderDetailPage /> },
        ],
      },
      {
        path: 'admin',
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'categories', element: <AdminCategoriesPage /> },
              { path: 'products', element: <AdminProductsPage /> },
              { path: 'products/:id', element: <AdminProductEditPage /> },
              { path: 'orders', element: <AdminOrdersPage /> },
              { path: 'orders/:id', element: <AdminOrderDetailPage /> },
              { path: 'reviews', element: <AdminReviewsPage /> },
              { path: 'vouchers', element: <AdminVouchersPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'audit-logs', element: <AdminAuditLogsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
