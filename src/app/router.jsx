import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { AdminRoute } from '../routes/AdminRoute'
import { Spinner } from '../components/Spinner'

// Route-level code splitting: pages load on demand so the initial bundle stays small
// (admin pages, in particular, ship in their own chunks behind the AdminRoute guard).
const named = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })))

const HomePage = named(() => import('../pages/home/HomePage'), 'HomePage')
const CategoryPage = named(() => import('../pages/catalog/CategoryPage'), 'CategoryPage')
const ProductPage = named(() => import('../pages/product/ProductPage'), 'ProductPage')
const CartPage = named(() => import('../pages/cart/CartPage'), 'CartPage')
const WishlistPage = named(() => import('../pages/wishlist/WishlistPage'), 'WishlistPage')
const LoginPage = named(() => import('../pages/auth/LoginPage'), 'LoginPage')
const RegisterPage = named(() => import('../pages/auth/RegisterPage'), 'RegisterPage')
const ForgotPasswordPage = named(() => import('../pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage')
const ResetPasswordPage = named(() => import('../pages/auth/ResetPasswordPage'), 'ResetPasswordPage')
const VerifyEmailPage = named(() => import('../pages/auth/VerifyEmailPage'), 'VerifyEmailPage')
const AccountPage = named(() => import('../pages/account/AccountPage'), 'AccountPage')
const AddressesPage = named(() => import('../pages/account/AddressesPage'), 'AddressesPage')
const CheckoutPage = named(() => import('../pages/checkout/CheckoutPage'), 'CheckoutPage')
const CheckoutReturnPage = named(() => import('../pages/checkout/CheckoutReturnPage'), 'CheckoutReturnPage')
const OrdersPage = named(() => import('../pages/orders/OrdersPage'), 'OrdersPage')
const OrderDetailPage = named(() => import('../pages/orders/OrderDetailPage'), 'OrderDetailPage')
const AdminLayout = named(() => import('../pages/admin/AdminLayout'), 'AdminLayout')
const AdminDashboardPage = named(() => import('../pages/admin/AdminDashboardPage'), 'AdminDashboardPage')
const AdminCategoriesPage = named(() => import('../pages/admin/categories/AdminCategoriesPage'), 'AdminCategoriesPage')
const AdminProductsPage = named(() => import('../pages/admin/products/AdminProductsPage'), 'AdminProductsPage')
const AdminProductCreatePage = named(() => import('../pages/admin/products/AdminProductCreatePage'), 'AdminProductCreatePage')
const AdminProductEditPage = named(() => import('../pages/admin/products/AdminProductEditPage'), 'AdminProductEditPage')
const AdminOrdersPage = named(() => import('../pages/admin/orders/AdminOrdersPage'), 'AdminOrdersPage')
const AdminOrderDetailPage = named(() => import('../pages/admin/orders/AdminOrderDetailPage'), 'AdminOrderDetailPage')
const AdminReviewsPage = named(() => import('../pages/admin/reviews/AdminReviewsPage'), 'AdminReviewsPage')
const AdminVouchersPage = named(() => import('../pages/admin/vouchers/AdminVouchersPage'), 'AdminVouchersPage')
const AdminEmployeesPage = named(() => import('../pages/admin/users/AdminEmployeesPage'), 'AdminEmployeesPage')
const AdminCustomersPage = named(() => import('../pages/admin/users/AdminCustomersPage'), 'AdminCustomersPage')
const AdminAuditLogsPage = named(() => import('../pages/admin/auditLogs/AdminAuditLogsPage'), 'AdminAuditLogsPage')
const NotFoundPage = named(() => import('../pages/NotFoundPage'), 'NotFoundPage')

const pageFallback = (
  <div className="flex justify-center py-24">
    <Spinner label="Đang tải..." />
  </div>
)

const lazyPage = (element) => <Suspense fallback={pageFallback}>{element}</Suspense>

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: lazyPage(<HomePage />) },
      { path: 'c/:categorySlug', element: lazyPage(<CategoryPage />) },
      { path: 'p/:productSlug', element: lazyPage(<ProductPage />) },
      { path: 'cart', element: lazyPage(<CartPage />) },
      { path: 'login', element: lazyPage(<LoginPage />) },
      { path: 'register', element: lazyPage(<RegisterPage />) },
      { path: 'forgot-password', element: lazyPage(<ForgotPasswordPage />) },
      { path: 'reset-password', element: lazyPage(<ResetPasswordPage />) },
      { path: 'verify-email', element: lazyPage(<VerifyEmailPage />) },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'account', element: lazyPage(<AccountPage />) },
          { path: 'account/addresses', element: lazyPage(<AddressesPage />) },
          { path: 'wishlist', element: lazyPage(<WishlistPage />) },
          { path: 'checkout', element: lazyPage(<CheckoutPage />) },
          { path: 'checkout/return', element: lazyPage(<CheckoutReturnPage />) },
          { path: 'orders', element: lazyPage(<OrdersPage />) },
          { path: 'orders/:id', element: lazyPage(<OrderDetailPage />) },
        ],
      },
      { path: '*', element: lazyPage(<NotFoundPage />) },
    ],
  },
  {
    // Admin is a standalone back-office shell (no storefront Header/Footer).
    path: '/admin',
    element: <AdminRoute />,
    children: [
      {
        element: lazyPage(<AdminLayout />),
        children: [
          { index: true, element: lazyPage(<AdminDashboardPage />) },
          { path: 'categories', element: lazyPage(<AdminCategoriesPage />) },
          { path: 'products', element: lazyPage(<AdminProductsPage />) },
          { path: 'products/new', element: lazyPage(<AdminProductCreatePage />) },
          { path: 'products/:id', element: lazyPage(<AdminProductEditPage />) },
          { path: 'orders', element: lazyPage(<AdminOrdersPage />) },
          { path: 'orders/:id', element: lazyPage(<AdminOrderDetailPage />) },
          { path: 'reviews', element: lazyPage(<AdminReviewsPage />) },
          { path: 'vouchers', element: lazyPage(<AdminVouchersPage />) },
          { path: 'employees', element: lazyPage(<AdminEmployeesPage />) },
          { path: 'customers', element: lazyPage(<AdminCustomersPage />) },
          { path: 'users', element: <Navigate to="/admin/employees" replace /> },
          { path: 'audit-logs', element: lazyPage(<AdminAuditLogsPage />) },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
