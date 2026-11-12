export type AdminRole = 'super_admin' | 'kyc_reviewer' | 'support'

export type AdminProfile = {
  id: string
  email: string
  role: AdminRole
  permissions: string[]
}

export type UserStatus = 'active' | 'frozen' | 'banned'
export type KycLevel = 'basic' | 'advanced' | 'enhanced'
export type KycStatus = 'pending' | 'approved' | 'rejected'
export type DocumentType = 'passport' | 'id_card' | 'drivers_license'

export type ExchangeUser = {
  id: string
  email: string
  phone: string | null
  status: UserStatus
  createdAt: string
  lastLoginAt: string | null
  kyc: { id: string; level: KycLevel; status: KycStatus } | null
}

export type KycSummary = {
  id: string
  userId: string
  level: KycLevel
  status: KycStatus
  rejectReason: string | null
  submittedAt: string
  reviewedAt: string | null
  reviewer?: { id: string; email: string; role: AdminRole } | null
}

export type KycPersonal = {
  legalName: string
  dateOfBirth: string
  country: string
  documentType: DocumentType
  documentNumber: string
  address?: string
}

export type KycDetail = KycSummary & {
  personal: KycPersonal
  reviewer: { id: string; email: string; role?: AdminRole } | null
  documents: Array<{
    id: string
    fileName: string
    contentType: string
    createdAt: string
    download?: { url: string; method: string; expiresInSec: number }
  }>
  history: Array<{
    id: string
    action: string
    metadata: unknown
    createdAt: string
    actor: { id: string; email: string; role: AdminRole } | null
  }>
}

export type AuditEntry = {
  id: string
  action: string
  targetType: string | null
  targetId: string | null
  metadata: unknown
  ip: string | null
  createdAt: string
  actor: { id: string; email: string; role: AdminRole } | null
}

export type PresaleSummary = {
  confirmationThreshold: number
  confirmed: {
    totalUsdt: string
    totalRaw: string
    txCount: number
    subscriberCount: number
    latestTransferAt: string | null
  }
  pending: {
    totalUsdt: string
    totalRaw: string
    txCount: number
    subscriberCount: number
  }
}

export type Subscriber = {
  address: string
  totalUsdt: string
  totalRaw: string
  txCount: number
  firstTransferAt: string | null
  lastTransferAt: string | null
  pendingTxCount: number
  pendingUsdt: string
  pendingRaw: string
  pendingOnly: boolean
}

export type Transfer = {
  txHash: string
  logIndex: number
  fromAddress: string
  toAddress: string
  amount: string
  amountRaw: string
  blockNumber: number
  blockHash: string
  blockTime: string
  confirmations: number
  pending: boolean
}

export type TransferPage = {
  address?: string
  items: Transfer[]
  page: number
  pageSize: number
  total: number
}

export type AdminAccount = {
  id: string
  email: string
  role: AdminRole
  status: 'active' | 'disabled'
  totpEnabled: boolean
  createdAt: string
  lastLoginAt: string | null
}

export type InviteResult = {
  token: string
  email: string
  role: AdminRole
  expiresInSec: number
}

export type InviteStart = {
  email: string
  role: AdminRole
  secret: string
  otpauthUrl: string
}

export type Page<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}
