import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Box, Burger } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import SideBar from '../components/SideBar';
import { TermosUsoModal, useTermosAceitos } from '../components/TermosUsoModal';
import { useAuth } from '../context/AuthContext';

const NAVBAR_WIDTH = 260;

export function DashboardLayout() {
  const termosAceitos = useTermosAceitos();
  const [modalAberto, setModalAberto] = useState(!termosAceitos);
  const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;
  const { clearAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (termosAceitos) setModalAberto(false);
  }, [termosAceitos]);

  useEffect(() => {
    if (!isMobile) closeNav();
  }, [isMobile, closeNav]);

  function handleAceitar() { setModalAberto(false); }
  function handleRecusar() { clearAuth(); navigate('/', { replace: true }); }

  return (
    <>
      <TermosUsoModal opened={modalAberto} onAceitar={handleAceitar} onRecusar={handleRecusar} />

      <AppShell
        navbar={{
          width: NAVBAR_WIDTH,
          breakpoint: 'md',
          collapsed: { mobile: !navOpened },
        }}
        padding={0}
        styles={{
          main: {
            backgroundColor: 'var(--hh-ground)',
            height: '100dvh',
            overflow: 'hidden',
          },
          navbar: {
            backgroundColor: 'var(--hh-surface)',
            borderRight: '1px solid var(--hh-border)',
          },
        }}
      >
        <AppShell.Navbar p={0}>
          <SideBar onNavClose={closeNav} />
        </AppShell.Navbar>

        <AppShell.Main>
          {isMobile && (
            <Box
              style={{
                position: 'fixed',
                top: 10,
                left: 10,
                zIndex: 300,
                background: 'var(--hh-surface)', border: '1px solid var(--hh-control)',
                borderRadius: 'var(--hh-radius-control)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px 6px',
              }}
            >
              <Burger opened={navOpened} onClick={toggleNav} size="sm" color="var(--hh-ink)" aria-label={navOpened ? 'Fechar menu' : 'Abrir menu'} />
            </Box>
          )}

          <Box
            h="100%"
            p={{ base: 'md', md: 'xl' }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflowY: 'auto',
              paddingTop: isMobile ? 52 : undefined,
            }}
          >
            {/* A chave por rota reinicia a animação de entrada a cada troca de tela */}
            <Box key={location.pathname} className="hh-page" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <Outlet />
            </Box>
          </Box>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
