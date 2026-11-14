import { useState } from 'react'
import { LandingScreen } from './components/landing/LandingScreen'
import { Scanner } from './components/scanner/Scanner'

export default function App() {
  const [scannerOpen, setScannerOpen] = useState(false)
  return scannerOpen
    ? <Scanner onExit={() => setScannerOpen(false)}/>
    : <LandingScreen onStart={() => setScannerOpen(true)}/>
}
