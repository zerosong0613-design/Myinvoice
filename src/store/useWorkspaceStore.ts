import { create } from 'zustand'
import type { Workspace } from '@/types'

interface WorkspaceState {
  workspace: Workspace | null
  loading: boolean
  setWorkspace: (workspace: Workspace | null) => void
  setLoading: (loading: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspace: null,
  loading: true,
  setWorkspace: (workspace) => set({ workspace }),
  setLoading: (loading) => set({ loading }),
}))
