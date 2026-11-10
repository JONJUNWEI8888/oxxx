export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAfterSec: number | null

  constructor(status: number, code: string, message: string, retryAfterSec: number | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfterSec = retryAfterSec
  }
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: '邮箱或密码不正确',
  enrollment_required: '此账号需要通过邀请链接完成验证器绑定后才能登录',
  admin_disabled: '此管理员账号已停用',
  invalid_mfa: '动态码不正确或已过期',
  totp_replay: '这个动态码已经用过，请等待下一组动态码',
  mfa_locked: '请稍后重试',
  rate_limited: '请稍后重试',
  rate_limiter_unavailable: '请稍后重试',
  backend_unavailable: '请稍后重试',
  invite_invalid: '邀请链接无效或已过期',
  totp_missing: '请先打开邀请并生成验证器密钥，然后再提交',
  admin_exists: '此管理员已经完成绑定',
  invite_used: '邀请已经使用过',
  forbidden: '没有权限执行此操作',
  csrf_invalid: '安全校验失败，请刷新页面后再试',
  ip_forbidden: '此网络不在允许的访问范围内',
  self_change: '不能修改自己的账号',
  last_super_admin: '不能变更最后一个超级管理员',
  unauthorized: '登录已失效，请重新登录',
  invalid_refresh: '登录已失效，请重新登录',
  user_exists: '已有相同邮箱或手机号的用户',
  not_found: '没有找到记录',
  invalid_status: '当前状态不能执行此操作',
  invalid_address: '钱包地址须为 20 字节十六进制地址',
  invalid_tx: '交易哈希须为 32 字节十六进制',
  export_too_large: '导出结果过多，请缩小筛选范围',
  validation_error: '请求参数不正确',
}

export function parseRetryAfter(value: string | null): number | null {
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds)
  const when = Date.parse(value)
  if (Number.isNaN(when)) return null
  return Math.max(0, Math.ceil((when - Date.now()) / 1000))
}

export function userMessage(error: ApiError): string {
  const retry =
    error.status === 429 ||
    error.status === 503 ||
    error.code === 'rate_limited' ||
    error.code === 'rate_limiter_unavailable' ||
    error.code === 'backend_unavailable' ||
    error.code === 'mfa_locked'
  if (retry) {
    return error.retryAfterSec && error.retryAfterSec > 0
      ? `请稍后重试（约 ${error.retryAfterSec} 秒）`
      : '请稍后重试'
  }
  return (
    MESSAGES[error.code] ??
    (error.status === 401
      ? '登录已失效，请重新登录'
      : error.status === 403
        ? '没有权限执行此操作'
        : error.status === 404
          ? '没有找到记录'
          : '操作未能完成，请稍后重试')
  )
}

export async function errorFromResponse(response: Response): Promise<ApiError> {
  const retryAfterSec = parseRetryAfter(response.headers.get('retry-after'))
  let code = 'request_failed'
  let message = response.statusText || 'Request failed'
  try {
    const data = (await response.json()) as { error?: { code?: unknown; message?: unknown } }
    if (typeof data.error?.code === 'string') code = data.error.code
    if (typeof data.error?.message === 'string') message = data.error.message
  } catch {
    // Non-JSON bodies still surface as status-based errors.
  }
  return new ApiError(response.status, code, message, retryAfterSec)
}
