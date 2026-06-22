import { useState } from 'react'
import EchoGrid from './EchoGrid'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <EchoGrid/>
    </>
  )
}

export default App
