import { Outlet } from 'react-router-dom'
import Sidebar, { MobileSidebar } from '@/components/layout/Sidebar'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b px-4 md:hidden">
          <MobileSidebar />
          <span className="ml-2 font-semibold">마이인보이스</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
