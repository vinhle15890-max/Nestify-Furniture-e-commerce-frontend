import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { AdminRoute } from '../routes/AdminRoute'
import { HomePage } from '../pages/home/HomePage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import { AccountPage } from '../pages/account/AccountPage'
import { AddressesPage } from '../pages/account/AddressesPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
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
