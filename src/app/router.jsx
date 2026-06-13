import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { ProtectedRoute } from '../routes/ProtectedRoute'
import { AdminRoute } from '../routes/AdminRoute'
import { HomePage } from '../pages/home/HomePage'
import { LoginPage } from '../pages/auth/LoginPage'
import { AccountPage } from '../pages/account/AccountPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: 'account', element: <AccountPage /> }],
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
