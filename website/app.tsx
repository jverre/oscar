import { StartClient } from '@tanstack/react-start/client'
import { createRouter } from './src/router'

const router = createRouter()

export default function App() {
  return <StartClient router={router} />
}