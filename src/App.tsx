import { Navigate, Route, Routes } from 'react-router-dom'
import { ExploreView } from './views/ExploreView'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ExploreView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
