import type { AdminRole, DocumentType, KycLevel, KycStatus, UserStatus } from '@/lib/api/types'

export const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: '超级管理员',
  kyc_reviewer: 'KYC 审核员',
  support: '客服',
}

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  active: '正常',
  frozen: '已冻结',
  banned: '已封禁',
}

export const KYC_STATUS_LABEL: Record<KycStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

export const KYC_LEVEL_LABEL: Record<KycLevel, string> = {
  basic: '基础',
  advanced: '进阶',
  enhanced: '增强',
}

export const DOCUMENT_LABEL: Record<DocumentType, string> = {
  passport: '护照',
  id_card: '身份证',
  drivers_license: '驾照',
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

/** Group the integer part. Keep every decimal digit. Never parse the amount as a number. */
export function formatUsdt(amount: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount.trim())
  if (!match) return `${amount} USDT`
  const sign = match[1]
  const whole = match[2].replace(/^0+(?=\d)/, '')
  const fraction = match[3] ?? ''
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const decimals = fraction.length >= 2 ? fraction : fraction.padEnd(2, '0')
  return `${sign}${grouped}.${decimals} USDT`
}

export function toIso(localValue: string): string | undefined {
  if (!localValue) return undefined
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}
