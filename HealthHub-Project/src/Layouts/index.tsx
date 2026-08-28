import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell, Box, Burger } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import SideBar from '../components/SideBar';
import { ChatBubble } from '../components/ChatBubble';
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
            backgroundColor: 'oklch(0.985 0.006 210)',
            height: '100dvh',
            overflow: 'hidden',
          },
          navbar: {
            backgroundColor: '#ffffff',
            borderRight: '1px solid oklch(0.92 0.01 220)',
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
                background: 'oklch(0.24 0.02 240)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                padding: '4px 6px',
              }}
            >
              <Burger opened={navOpened} onClick={toggleNav} size="sm" color="white" aria-label="Abrir menu" />
            </Box>
          )}

          <Box
            h="100%"
            p={{ base: 'sm', md: 'xl' }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflowY: 'auto',
              paddingTop: isMobile ? 52 : undefined,
            }}
          >
            <Outlet />
          </Box>
        </AppShell.Main>
      </AppShell>

      {/* Bolinha flutuante de chat — visível em todas as telas do /main */}
      <ChatBubble />
    </>
  );
}
