import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import { Patients } from './pages/Patients'
import { Monitoring } from './pages/Monitoring'
import { Alerts } from './pages/Alerts'
import { ExportPDF } from './pages/ExportPDF'
import { PoliticaDados } from './pages/PoliticaDados'
import { Chat } from './pages/Chat'
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

// Em mobile, bloqueia rotas não relevantes e redireciona para alertas
function MobileBlock({ children, redirectTo = '/main/alertas' }: { children: React.ReactNode; redirectTo?: string }) {
  const isMobile = useMobile()
  if (isMobile) return <Navigate to={redirectTo} replace />
  return <>{children}</>
}

function DefaultHome() {
  const { role } = useAuth()
  const isMobile = useMobile()
  if (isMobile) return <Navigate to="/main/alertas" replace />
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

            {/* ── Rotas desktop (responsivas para todos os roles) ── */}
            <Route
              path="/main"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<DefaultHome />} />
              <Route path="pacientes" element={<Patients />} />
              <Route
                path="monitor"
                element={
                  <MobileBlock>
                    <RoleRoute roles={['medico', 'enfermeiro']}>
                      <Monitoring />
                    </RoleRoute>
                  </MobileBlock>
                }
              />
              <Route path="alertas" element={<Alerts />} />
              <Route
                path="exportar"
                element={
                  <MobileBlock>
                    <RoleRoute roles={['medico', 'enfermeiro']}>
                      <ExportPDF />
                    </RoleRoute>
                  </MobileBlock>
                }
              />
              <Route path="chat" element={<Navigate to="/chat" replace />} />
              <Route path="politica" element={<PoliticaDados />} />
            </Route>

            {/* ── Rota mobile dedicada (opcional, todos os roles) ── */}
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

            {/* ── Chat full-screen (sem sidebar) ── */}
            <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </CareProvider>
    </AuthProvider>
  )
}
