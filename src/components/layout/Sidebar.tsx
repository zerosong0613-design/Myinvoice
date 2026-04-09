import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  FileMinus,
  Users,
  Package,
  FolderTree,
  BarChart3,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { useState, useEffect } from 'react'
import type { Workspace } from '@/types'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/invoices', icon: FileText, label: '청구서' },
  { to: '/quotes', icon: FileCheck, label: '견적서' },
  { to: '/credit-notes', icon: FileMinus, label: '신용전표' },
  { to: '/customers', icon: Users, label: '거래처' },
  { to: '/products', icon: Package, label: '품목' },
  { to: '/categories', icon: FolderTree, label: '카테고리' },
  { to: '/statistics', icon: BarChart3, label: '통계' },
  { to: '/settings', icon: Settings, label: '설정' },
]

function NavContent({ onClose }: { onClose?: () => void }) {
  const { user } = useAuthStore()
  const { workspace, setWorkspace } = useWorkspaceStore()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])

  useEffect(() => {
    if (!user) return
    const loadWorkspaces = async () => {
      const { data } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
      if (data) {
        setWorkspaces(
          data
            .map((d) => d.workspaces as unknown as Workspace)
            .filter(Boolean)
        )
      }
    }
    loadWorkspaces()
  }, [user])

  const handleSwitchWorkspace = (ws: Workspace) => {
    setWorkspace(ws)
    navigate('/')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col">
      {workspaces.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 px-4 py-5 text-left hover:bg-accent transition-colors">
              <FileText className="h-6 w-6 text-primary shrink-0" />
              <span className="font-semibold truncate">
                {workspace?.name ?? '마이인보이스'}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => handleSwitchWorkspace(ws)}
                className={cn(ws.id === workspace?.id && 'bg-accent')}
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-2 px-4 py-5">
          <FileText className="h-6 w-6 text-primary" />
          <span className="font-semibold truncate">
            {workspace?.name ?? '마이인보이스'}
          </span>
        </div>
      )}

      <Separator />

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">메뉴 열기</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">네비게이션 메뉴</SheetTitle>
        <NavContent onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

export default function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-background">
      <NavContent />
    </aside>
  )
}
