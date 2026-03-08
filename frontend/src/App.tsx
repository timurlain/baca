import { BrowserRouter, Routes, Route } from 'react-router-dom'

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-center text-gray-600">Stránka: {name} — Zatím neimplementováno</div>
}

function ResponsiveHome() {
  const isMobile = window.innerWidth < 768
  return isMobile
    ? <Placeholder name="Můj fokus" />
    : <Placeholder name="Dashboard" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Placeholder name="Přihlášení" />} />
        <Route path="/" element={<ResponsiveHome />} />
        <Route path="/dashboard" element={<Placeholder name="Dashboard" />} />
        <Route path="/board" element={<Placeholder name="Kanban Board" />} />
        <Route path="/board/user" element={<Placeholder name="Board — Per User" />} />
        <Route path="/voice" element={<Placeholder name="Hlasový vstup" />} />
        <Route path="/admin/users" element={<Placeholder name="Správa uživatelů" />} />
        <Route path="/admin/categories" element={<Placeholder name="Správa kategorií" />} />
        <Route path="/admin/settings" element={<Placeholder name="Nastavení" />} />
        <Route path="/guide" element={<Placeholder name="Příručka" />} />
      </Routes>
    </BrowserRouter>
  )
}
