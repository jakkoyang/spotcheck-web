import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomeView } from './views/HomeView'
import { MapView } from './views/MapView'
import { SearchView } from './views/SearchView'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomeView />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/search" element={<SearchView />} />
      </Route>
    </Routes>
  )
}

export default App
