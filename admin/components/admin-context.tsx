'use client'

import { createContext, useContext } from 'react'
import type { AdminProfile } from '@/lib/api/types'

const AdminContext = createContext<AdminProfile | null>(null)

export function AdminProvider({ value, children }: { value: AdminProfile; children: React.ReactNode }) {
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminProfile {
  const admin = useContext(AdminContext)
  if (!admin) throw new Error('Admin profile is unavailable')
  return admin
}
