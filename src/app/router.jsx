import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { AdminRoute } from '../routes/AdminRoute'
import { RequirePermission } from '../routes/RequirePermission'
import { Spinner } from '../components/Spinner'
import { DiagnosticRouteErrorBoundary } from '../pages/dev/DiagnosticRouteErrorBoundary'
import { RootRoute } from '../routes/RootRoute'

// Route-level code splitting: pages load on demand so the initial bundle stays small
// (admin pages, in particular, ship in their own chunks behind the AdminRoute guard).
const named = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })))

const HomePage = named(() => import('../pages/home/HomePage'), 'HomePage')
const AboutPage = named(() => import('../pages/about/AboutPage'), 'AboutPage')
const ShippingPage = named(() => import('../pages/support/SupportPages'), 'ShippingPage')
const ReturnsPage = named(() => import('../pages/support/SupportPages'), 'ReturnsPage')
const PrivacyPage = named(() => import('../pages/support/SupportPages'), 'PrivacyPage')
const ContactPage = named(() => import('../pages/support/SupportPages'), 'ContactPage')
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
const MyRoomsPage = named(() => import('../pages/account/MyRoomsPage'), 'MyRoomsPage')
const CheckoutPage = named(() => import('../pages/checkout/CheckoutPage'), 'CheckoutPage')
const CheckoutReturnPage = named(() => import('../pages/checkout/CheckoutReturnPage'), 'CheckoutReturnPage')
const OrdersPage = named(() => import('../pages/orders/OrdersPage'), 'OrdersPage')
const OrderDetailPage = named(() => import('../pages/orders/OrderDetailPage'), 'OrderDetailPage')
const AdminLayout = named(() => import('../pages/admin/AdminLayout'), 'AdminLayout')
const AdminHome = named(() => import('../pages/admin/AdminHome'), 'AdminHome')
const AdminCategoriesPage = named(() => import('../pages/admin/categories/AdminCategoriesPage'), 'AdminCategoriesPage')
const AdminProductsPage = named(() => import('../pages/admin/products/AdminProductsPage'), 'AdminProductsPage')
const AdminProductCreatePage = named(() => import('../pages/admin/products/AdminProductCreatePage'), 'AdminProductCreatePage')
const AdminProductEditPage = named(() => import('../pages/admin/products/AdminProductEditPage'), 'AdminProductEditPage')
const AdminSeoReviewPage = named(() => import('../pages/admin/products/AdminSeoReviewPage'), 'AdminSeoReviewPage')
const AdminMediaLibraryPage = named(() => import('../pages/admin/media/AdminMediaLibraryPage'), 'AdminMediaLibraryPage')
const AdminOrdersPage = named(() => import('../pages/admin/orders/AdminOrdersPage'), 'AdminOrdersPage')
const AdminOrderDetailPage = named(() => import('../pages/admin/orders/AdminOrderDetailPage'), 'AdminOrderDetailPage')
const AdminReviewsPage = named(() => import('../pages/admin/reviews/AdminReviewsPage'), 'AdminReviewsPage')
const AdminVouchersPage = named(() => import('../pages/admin/vouchers/AdminVouchersPage'), 'AdminVouchersPage')
const AdminEmployeesPage = named(() => import('../pages/admin/users/AdminEmployeesPage'), 'AdminEmployeesPage')
const AdminCustomersPage = named(() => import('../pages/admin/users/AdminCustomersPage'), 'AdminCustomersPage')
const AdminRolesPage = named(() => import('../pages/admin/roles/AdminRolesPage'), 'AdminRolesPage')
const AdminAuditLogsPage = named(() => import('../pages/admin/auditLogs/AdminAuditLogsPage'), 'AdminAuditLogsPage')
const RoomPlannerPage = named(() => import('../pages/roomPlanner/RoomPlannerPage'), 'RoomPlannerPage')
const SharedRoomPage = named(() => import('../pages/roomPlanner/SharedRoomPage'), 'SharedRoomPage')
const R2ModelDiagnosticPage = import.meta.env.DEV
  ? named(() => import('../pages/dev/R2ModelDiagnosticPage'), 'R2ModelDiagnosticPage')
  : null
const NotFoundPage = named(() => import('../pages/NotFoundPage'), 'NotFoundPage')

const pageFallback = (
  <div className="flex justify-center py-24">
    <Spinner label="Đang tải..." />
  </div>
)

const lazyPage = (element) => <Suspense fallback={pageFallback}>{element}</Suspense>

const appRoutes = [
  ...(import.meta.env.DEV ? [{
    path: '/__dev/r2-model',
    element: <DiagnosticRouteErrorBoundary>{lazyPage(<R2ModelDiagnosticPage />)}</DiagnosticRouteErrorBoundary>,
  }] : []),
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: lazyPage(<HomePage />) },
      { path: 'about', element: lazyPage(<AboutPage />) },
      { path: 'shipping', element: lazyPage(<ShippingPage />) },
      { path: 'returns', element: lazyPage(<ReturnsPage />) },
      { path: 'privacy', element: lazyPage(<PrivacyPage />) },
      { path: 'contact', element: lazyPage(<ContactPage />) },
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
          { path: 'account/rooms', element: lazyPage(<MyRoomsPage />) },
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
    // A guest can begin and keep a room; persisted rooms remain account-owned.
    path: '/room-planner',
    element: lazyPage(<RoomPlannerPage />),
  },
  {
    // Full-screen 3D planner — standalone chrome, logged-in only.
    element: <ProtectedRoute />,
    children: [
      { path: '/room-planner/:id', element: lazyPage(<RoomPlannerPage />) },
    ],
  },
  {
    // Public read-only shared scene — no auth, no storefront chrome.
    path: '/room-planner/shared/:token',
    element: lazyPage(<SharedRoomPage />),
  },
  {
    // Admin is a standalone back-office shell (no storefront Header/Footer).
    path: '/admin',
    element: <AdminRoute />,
    children: [
      {
        element: lazyPage(<AdminLayout />),
        children: [
          { index: true, element: lazyPage(<AdminHome />) },
          {
            element: <RequirePermission slug="manage_categories" />,
            children: [{ path: 'categories', element: lazyPage(<AdminCategoriesPage />) }],
          },
          {
            element: <RequirePermission slug="manage_products" />,
            children: [
              { path: 'products', element: lazyPage(<AdminProductsPage />) },
              { path: 'products/new', element: lazyPage(<AdminProductCreatePage />) },
              { path: 'products/seo', element: lazyPage(<AdminSeoReviewPage />) },
              { path: 'products/:id', element: lazyPage(<AdminProductEditPage />) },
            ],
          },
          {
            element: <RequirePermission slug="manage_products" />,
            children: [{ path: 'media', element: lazyPage(<AdminMediaLibraryPage />) }],
          },
          {
            element: <RequirePermission slug="manage_orders" />,
            children: [
              { path: 'orders', element: lazyPage(<AdminOrdersPage />) },
              { path: 'orders/:id', element: lazyPage(<AdminOrderDetailPage />) },
            ],
          },
          {
            element: <RequirePermission slug="manage_vouchers" />,
            children: [{ path: 'vouchers', element: lazyPage(<AdminVouchersPage />) }],
          },
          {
            element: <RequirePermission slug="moderate_reviews" />,
            children: [{ path: 'reviews', element: lazyPage(<AdminReviewsPage />) }],
          },
          {
            element: <RequirePermission slug="manage_users" />,
            children: [
              { path: 'employees', element: lazyPage(<AdminEmployeesPage />) },
              { path: 'customers', element: lazyPage(<AdminCustomersPage />) },
              { path: 'roles', element: lazyPage(<AdminRolesPage />) },
              { path: 'users', element: <Navigate to="/admin/employees" replace /> },
            ],
          },
          {
            element: <RequirePermission slug="view_audit" />,
            children: [{ path: 'audit-logs', element: lazyPage(<AdminAuditLogsPage />) }],
          },
        ],
      },
    ],
  },
]

export const routes = [{ element: <RootRoute />, children: appRoutes }]

export const router = createBrowserRouter(routes, {
  future: { v7_relativeSplatPath: true },
})
