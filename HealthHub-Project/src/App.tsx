import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import { Patients } from './pages/Patients'
import { Monitoring } from './pages/Monitoring'
import { Alerts } from './pages/Alerts'
import { ExportPDF } from './pages/ExportPDF'
import { PoliticaDados } from './pages/PoliticaDados'
import { DashboardLayout } from './Layouts'
import { MobileLayout } from './Layouts/MobileLayout'
import { MobileTriage } from './pages/MobileTriage'
import DashboardHome from './pages/Dashboard'
import { CareProvider } from './context/CareContext'
import { AuthProvider, useAuth, type UserRole } from './context/AuthContext'
import { useMobile } from './hooks/useMobile'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token || token === 'undefined' || token === 'null') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: UserRole[] }) {
  const { role } = useAuth()
  if (!role || !roles.includes(role)) {
    return <Navigate to="/main/alertas" replace />
  }
  return <>{children}</>
}

// Redireciona usuários móveis (enfermeiro/recepcionista) para o fluxo mobile
function MobileGuard({ children }: { children: React.ReactNode }) {
  const { role } = useAuth()
  const isMobile = useMobile()
  if (isMobile && (role === 'enfermeiro' || role === 'recepcionista')) {
    return <Navigate to="/mobile" replace />
  }
  return <>{children}</>
}

function DefaultHome() {
  const { role } = useAuth()
  const isMobile = useMobile()
  if (isMobile && (role === 'enfermeiro' || role === 'recepcionista')) {
    return <Navigate to="/mobile" replace />
  }
  if (role === 'recepcionista') return <Navigate to="/main/alertas" replace />
  return <DashboardHome />
}

export default function App() {
  return (
    <AuthProvider>
      <CareProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />

            {/* ── Rotas desktop ── */}
            <Route
              path="/main"
              element={
                <PrivateRoute>
                  <MobileGuard>
                    <DashboardLayout />
                  </MobileGuard>
                </PrivateRoute>
              }
            >
              <Route index element={<DefaultHome />} />
              <Route path="pacientes" element={<Patients />} />
              <Route
                path="monitor"
                element={
                  <RoleRoute roles={['medico', 'enfermeiro']}>
                    <Monitoring />
                  </RoleRoute>
                }
              />
              <Route path="alertas" element={<Alerts />} />
              <Route
                path="exportar"
                element={
                  <RoleRoute roles={['medico', 'enfermeiro']}>
                    <ExportPDF />
                  </RoleRoute>
                }
              />
              <Route path="politica" element={<PoliticaDados />} />
            </Route>

            {/* ── Rotas mobile (enfermeiro / recepcionista) ── */}
            <Route
              path="/mobile"
              element={
                <PrivateRoute>
                  <RoleRoute roles={['enfermeiro', 'recepcionista']}>
                    <MobileLayout />
                  </RoleRoute>
                </PrivateRoute>
              }
            >
              <Route index element={<MobileTriage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </CareProvider>
    </AuthProvider>
  )
}
