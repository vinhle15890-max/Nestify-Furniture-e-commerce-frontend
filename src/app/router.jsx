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
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
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
        children: [{ index: true, element: <AdminDashboardPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
