import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import '@mantine/charts/styles.css'
import './index.css'
import App from './App.tsx'
import { MantineProvider } from '@mantine/core'
import { healthHubTheme } from './theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={healthHubTheme} defaultColorScheme="light" forceColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>,
)
