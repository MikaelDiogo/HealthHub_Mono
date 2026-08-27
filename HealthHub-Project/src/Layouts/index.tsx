import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell, Box } from '@mantine/core';
import SideBar from '../components/SideBar';
import { TermosUsoModal, useTermosAceitos } from '../components/TermosUsoModal';
import { useAuth } from '../context/AuthContext';

const NAVBAR_WIDTH = 260;

export function DashboardLayout() {
  const termosAceitos = useTermosAceitos();
  const [modalAberto, setModalAberto] = useState(!termosAceitos);
  const { clearAuth } = useAuth();
  const navigate = useNavigate();

  // Se o usuário já aceitou, garante que o modal não abre
  useEffect(() => {
    if (termosAceitos) setModalAberto(false);
  }, [termosAceitos]);

  function handleAceitar() {
    setModalAberto(false);
  }

  function handleRecusar() {
    clearAuth();
    navigate('/', { replace: true });
  }

  return (
    <>
      <TermosUsoModal
        opened={modalAberto}
        onAceitar={handleAceitar}
        onRecusar={handleRecusar}
      />

      <AppShell
        navbar={{ width: NAVBAR_WIDTH, breakpoint: 'sm' }}
        padding={0}
        styles={{
          main: {
            backgroundColor: 'var(--mantine-color-slate-0)',
            height: '100dvh',
            overflow: 'hidden',
          },
          navbar: {
            backgroundColor: '#ffffff',
            borderRight: '1px solid var(--mantine-color-slate-2)',
          },
        }}
      >
        <AppShell.Navbar p={0}>
          <SideBar />
        </AppShell.Navbar>

        <AppShell.Main>
          <Box
            h="100%"
            p={{ base: 'md', md: 'xl' }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            <Outlet />
          </Box>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
