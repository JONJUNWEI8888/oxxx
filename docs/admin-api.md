# 管理后台 API（给前端）

管理控制台是独立的 Vercel 项目，域名和公开站分开，例如 `https://admin.oxxx.io`。本服务是它的后端。所有授权都在服务端执行。`GET /api/v1/auth/me` 里的 `permissions` 只用于隐藏按钮，不能当作权限判断。

下文的路径都相对于 API 根，例如 `https://api.oxxx.io`。本地默认是 `http://localhost:4000`。交互式文档在 `GET /docs`，机器可读规格是 `backend/openapi.json`。

## 浏览器怎么连

控制台请求必须带凭据：

```ts
fetch(`${API}/api/v1/auth/me`, { credentials: 'include' })
```

服务端只反射一个来源。生产设置 `ADMIN_CONSOLE_ORIGIN=https://admin.oxxx.io`（只要协议、主机、端口，不要路径）。设置之后 `ADMIN_CORS_ORIGINS` 不再生效，公开站 `https://oxxx.io` 读不到响应。未设置时才退回 `ADMIN_CORS_ORIGINS`（逗号分隔，本地默认 `http://localhost:3000`）。预检允许的请求头包含 `content-type`、`authorization`、`x-csrf-token`。前端可读的响应头包含 `retry-after`。

### Cookie

登录第二步（密码通过之后提交 TOTP）会写三枚 `__Host-` Cookie。服务端**不设置 `Domain`**，并且总是带 `Secure` 和 `Path=/`。浏览器会拒绝把这种 Cookie 放到父域上，所以公开站收不到它。`PUBLIC_BASE_URL` 必须是 `https://`，否则浏览器会丢掉这些 Cookie。

| 名称 | 内容 |
| --- | --- |
| `__Host-oxxx_admin_access` | 访问 JWT，默认 15 分钟 |
| `__Host-oxxx_admin_refresh` | 刷新令牌，默认 7 天 |
| `__Host-oxxx_admin_csrf` | CSRF 令牌，和刷新令牌同时过期 |

三枚都是 `HttpOnly`、`Secure`、`Path=/`、`SameSite=Lax`。控制台和 API 不在同一个站点（例如 `admin.vercel.app` 调用 `api.oxxx.io`）时，`SameSite` 改为 `None`。本地请让两边都用 `localhost`（不要一个用 `localhost`、一个用 `127.0.0.1`）。

响应 JSON **不包含** `accessToken` 或 `refreshToken`。会话只存在 Cookie 里。

### CSRF

`csrfToken` 是 `HMAC-SHA256(CSRF_SECRET, 会话 id)`。`CSRF_SECRET` 是单独的环境变量，不是 `JWT_SECRET`。会话 id 是刷新令牌在数据库里的 id。带上述任一 Cookie 的 `POST` / `PATCH` / `PUT` / `DELETE` 必须带：

```http
Content-Type: application/json
X-CSRF-Token: <csrfToken>
```

不是 `application/json` 时返回 `415`，`error.code` 为 `unsupported_media_type`。空的 `text/plain` 也会被拒绝。值来自本次 MFA 或刷新响应的 `csrfToken`，也可以在页面重新打开后请求：

- `GET /api/v1/auth/me`（访问 Cookie 还有效）
- `GET /api/v1/auth/csrf`（按会话 id 重新计算，不把 Cookie 里的值原样吐出）

不匹配时返回 `403`，`error.code` 为 `csrf_invalid`。只使用 `Authorization: Bearer`、请求里没有这些 Cookie 时，不检查 CSRF。

豁免名单只有还没有会话的接口：`POST /api/v1/auth/login`、`POST /api/v1/auth/mfa`、`POST /api/v1/auth/invites/start`、`POST /api/v1/auth/invites/redeem`。判断用的是路由模式，不是原始 URL，所以 `/%61pi/v1/...` 这种编码路径一样要带 CSRF。证件上传 `PUT /api/v1/storage/local` 用签名地址，可以不是 JSON；如果请求里同时带了会话 Cookie，仍然要带 CSRF。

### IP 允许列表

`ADMIN_IP_ALLOWLIST` 是逗号分隔的 IP 或 CIDR（例如 `203.0.113.0/24,2001:db8::/32`）。列表打开时，除了 `GET /health`，所有路径都看 `request.ip`，不在列表里返回 `403`，`error.code` 为 `ip_forbidden`。编码路径、大小写和多余斜杠不会绕过。`/docs` 和定时任务 `/api/v1/internal/*` 也在列表里，调用它们的机器必须在允许的网段中。

开发和测试可以留空，等于关闭。生产环境留空会拒绝启动。只有显式设置 `ADMIN_IP_ALLOWLIST_DISABLED=true` 才允许所有 IP，进程会打一条醒目的安全日志。别的值（例如 `yes`）不算关闭。`TRUST_PROXY_HOPS=0` 时忽略客户端自己带的 `X-Forwarded-For`。前面只有一层反向代理时设为 `1`。

### 不被搜索引擎收录

`/api/*` 和 `/docs` 的响应都带：

```http
X-Robots-Tag: noindex, nofollow
```

## 分页和错误

列表统一为：

```json
{ "items": [], "page": 1, "pageSize": 20, "total": 0 }
```

`page` 从 1 开始，`pageSize` 最大 100，默认 20。

错误统一为：

```json
{ "error": { "code": "forbidden", "message": "Insufficient role" } }
```

校验失败是 `400` / `validation_error`。没有匹配的路由是 `404` / `not_found`。

| HTTP | code | 什么时候 |
| --- | --- | --- |
| 400 | `validation_error` | 查询、路径或 JSON 不符合模式 |
| 400 | `invalid_address` | 钱包地址不是 20 字节十六进制 |
| 400 | `invalid_tx` | 交易哈希不是 32 字节十六进制 |
| 400 | `export_too_large` | CSV 超过 10 万行，先收窄筛选 |
| 400 | `totp_missing` | 邀请还没打开就提交了密码 |
| 401 | `unauthorized` | 没有访问令牌，或令牌无效、会话已作废 |
| 401 | `invalid_credentials` | 邮箱或密码错误 |
| 401 | `invalid_mfa` | 动态码错误，或 MFA 挑战过期 |
| 401 | `totp_replay` | 这个时间步的动态码已经用过 |
| 401 | `invalid_refresh` | 刷新令牌无效、过期或已登出 |
| 403 | `forbidden` | 角色不够。前端应隐藏入口，服务端仍会拒绝 |
| 403 | `admin_disabled` | 管理员已被禁用 |
| 403 | `enrollment_required` | 账号还没走邀请链接完成 TOTP |
| 403 | `csrf_invalid` | Cookie 会话的变更请求缺少或带错 `X-CSRF-Token` |
| 403 | `ip_forbidden` | 客户端 IP 不在 `ADMIN_IP_ALLOWLIST` |
| 404 | `not_found` | 用户、KYC、管理员或证件不存在 |
| 409 | `invalid_status` | 当前状态不允许这个操作 |
| 409 | `user_exists` | 邮箱或手机号已存在 |
| 409 | `admin_exists` | 这个管理员已经完成绑定 |
| 409 | `invite_used` | 邀请刚被用掉 |
| 409 | `self_change` | 不能修改或禁用自己 |
| 409 | `last_super_admin` | 不能去掉最后一个活跃的超级管理员 |
| 410 | `invite_invalid` | 邀请无效或过期 |
| 413 | `upload_too_large` | 证件超过 8 MB |
| 415 | `unsupported_media_type` | 上传的 Content-Type 和签名不一致 |
| 429 | `rate_limited` | 登录或全局限流。可以带 `Retry-After` |
| 429 | `mfa_locked` | 动态码连续失败 5 次，锁定 15 分钟 |
| 503 | `rate_limiter_unavailable` | 登录、MFA、邀请打开和邀请绑定在 Redis 不可用时失败关闭 |

`503` 示例：

```http
HTTP/1.1 503 Service Unavailable
Retry-After: 7
Content-Type: application/json

{ "error": { "code": "rate_limiter_unavailable", "message": "Authentication is temporarily unavailable" } }
```

收到 `503` 时按 `Retry-After` 的秒数等待再重试，不要改走本地计数。`401` 表示要重新登录。`403` 表示已经登录但这一步不被允许（角色、CSRF、IP 或账号禁用），刷新页面不会好。

## 权限

`GET /api/v1/auth/me` 的 `permissions` 是当前角色拥有的键。角色存在服务端，改角色或禁用会让旧访问令牌失效。

| 权限 | super_admin | kyc_reviewer | support |
| --- | --- | --- | --- |
| `users.read` | 是 | 是 | 是。邮箱和手机号打码 |
| `users.create` | 是 | | |
| `users.freeze` / `users.unfreeze` | 是 | | 是 |
| `users.ban` | 是 | | |
| `kyc.read` / `kyc.review` | 是 | 是 | |
| `kyc.create` | 是 | | |
| `audit.read` | 是 | 是 | 是 |
| `presale.read` / `presale.export` | 是 | | 是 |
| `admins.read` / `admins.invite` / `admins.update` | 是 | | |

除了登录、MFA、邀请打开和绑定、健康检查和签名存储地址，请求都要带登录时写下的 Cookie。变更请求还要带 `Content-Type: application/json` 和 `X-CSRF-Token`。服务端仍接受 `Authorization: Bearer`，但响应 JSON 不会返回这个令牌。读接口会写审计日志；`GET /api/v1/auth/me` 和 `GET /api/v1/auth/csrf` 不写，避免每次打开页面都记一条。

## 1. 会话

### `POST /api/v1/auth/login`

密码正确不会发访问令牌。

请求：

```json
{ "email": "root@example.com", "password": "correct-horse-1" }
```

响应 `200`：

```json
{ "status": "mfa", "mfaToken": "…至少 20 字符…" }
```

`mfaToken` 5 分钟内有效。密码错误是 `401 invalid_credentials`。账号禁用是 `403 admin_disabled`。还没完成邀请绑定是 `403 enrollment_required`。动态码已被锁是 `429 mfa_locked`。同一 IP 加账号失败太多是 `429 rate_limited`。

### `POST /api/v1/auth/mfa`

```json
{ "mfaToken": "…", "code": "123456" }
```

响应 `200`：

```json
{
  "expiresIn": 900,
  "csrfToken": "…",
  "admin": {
    "id": "8d0c0b2e-1c2a-4e5e-9c1a-0b0c0d0e0f10",
    "email": "root@example.com",
    "role": "super_admin",
    "permissions": ["users.read", "admins.read", "kyc.review", "presale.export"]
  }
}
```

同时 `Set-Cookie` 三枚 `__Host-` 会话 Cookie。响应里没有访问令牌和刷新令牌。`permissions` 是完整列表，上面只是示意。动态码错误是 `401 invalid_mfa`，重用是 `401 totp_replay`。

### `POST /api/v1/auth/refresh`

Cookie 会话发送 `{}`，`Content-Type: application/json`，并带 CSRF。成功响应和 MFA 一样：新的 `csrfToken`、新的 Cookie，没有令牌字段。旧刷新令牌立即作废。

### `POST /api/v1/auth/logout`

```json
{}
```

作废这一次会话（刷新令牌行标成已撤销）并清除三枚 Cookie（`Max-Age=0`）。响应 `{ "ok": true }`。已经登出再调也是 `200`。登出之后，之前拿到的访问令牌立刻失效：再调受保护接口会得到 `401 unauthorized`。改角色和禁用也会撤销该管理员的全部会话。

### `GET /api/v1/auth/me`

```json
{
  "id": "8d0c0b2e-1c2a-4e5e-9c1a-0b0c0d0e0f10",
  "email": "root@example.com",
  "role": "super_admin",
  "permissions": ["users.read", "users.create"],
  "csrfToken": "…或 null…"
}
```

没有 Cookie 时 `csrfToken` 为 `null`。未登录是 `401 unauthorized`。

### `GET /api/v1/auth/csrf`

```json
{ "csrfToken": "…或 null…" }
```

页面刷新后、访问令牌已过期时，用它取出 CSRF，再 `POST /api/v1/auth/refresh`。

### 邀请

超级管理员：

`POST /api/v1/auth/invites` 或 `POST /api/v1/admin/invites`

```json
{ "email": "new@example.com", "role": "support" }
```

响应 `200`：`{ "token", "email", "role", "expiresInSec": 86400 }`。`token` 只出现这一次。需要 `admins.invite`。

被邀请人打开链接：

`POST /api/v1/auth/invites/start`，body `{ "token" }`。响应含 `email`、`role`、`secret`、`otpauthUrl`。用 `otpauthUrl` 生成二维码。

`POST /api/v1/auth/invites/redeem`

```json
{ "token": "…", "password": "at-least-12-chars", "code": "123456" }
```

成功 `{ "ok": true }`。之后走普通登录。邀请 24 小时有效，用过即废，返回 `410 invite_invalid`。

## 2. 用户

需要 `users.read`，除非另行注明。`support` 看到的邮箱是 `a***@example.com` 这种，手机号只留头两位和末两位。审计日志不记录邮箱和手机号原文。

### `GET /api/v1/users`

| 查询参数 | 说明 |
| --- | --- |
| `status` | `active`、`frozen`、`banned` |
| `kycStatus` | 最近一条 KYC：`pending`、`approved`、`rejected`，或 `none`（从未提交） |
| `createdFrom` / `createdTo` | ISO 时间，含时区，例如 `2026-11-01T00:00:00.000Z` |
| `email` | 精确匹配。大小写不敏感，走盲索引，不能模糊搜索 |
| `phone` | 精确匹配入库时的字符串，例如 `+15551212` |
| `q` | 兼容旧参数。含 `@` 当邮箱，UUID 当用户 id，否则当手机号 |
| `page` / `pageSize` | 分页 |

响应里每一项：

```json
{
  "id": "2b1c…",
  "email": "ada@example.com",
  "phone": "+15551212",
  "status": "active",
  "createdAt": "2026-11-04T00:00:00.000Z",
  "lastLoginAt": null,
  "kyc": { "id": "…", "level": "basic", "status": "pending" }
}
```

没有 KYC 时 `kyc` 为 `null`。`support` 的 `email` / `phone` 是打码后的值，`kyc` 仍在。

### `GET /api/v1/users/:id`

同上，并带最近一条 KYC 的 `id`、`level`、`status`。不存在是 `404 not_found`。

### `POST /api/v1/users/:id/freeze` 和 `/unfreeze`

需要 `users.freeze` 或 `users.unfreeze`。body 可带 `{ "reason": "最多 500 字" }`。冻结只接受 `active`，解冻只接受 `frozen`。状态不对是 `409 invalid_status`。成功返回用户对象。

`POST /api/v1/users/:id/ban` 需要 `users.ban`，把 `active` 或 `frozen` 改为 `banned`。

`POST /api/v1/users` 需要 `users.create`，代建用户：`{ "email", "phone?" }`。重复是 `409 user_exists`。

## 3. KYC

队列和详情需要 `kyc.read`。通过和拒绝需要 `kyc.review`。`support` 调用这些接口得到 `403 forbidden`。

### `GET /api/v1/kyc`

审核队列。`status` 为 `pending`、`approved` 或 `rejected`，`level` 为 `basic`、`advanced` 或 `enhanced`。不传 `status` 时返回全部。按提交时间从早到晚。

每一项：

```json
{
  "id": "…",
  "userId": "…",
  "level": "advanced",
  "status": "pending",
  "rejectReason": null,
  "submittedAt": "2026-11-04T00:00:00.000Z",
  "reviewedAt": null
}
```

### `GET /api/v1/kyc/:id`

个人资料是解密后的对象。证件带 120 秒有效的下载地址。`history` 是这条申请的审计事件（创建、通过、拒绝、证件地址），不含证件号码。

```json
{
  "id": "…",
  "userId": "…",
  "level": "advanced",
  "status": "pending",
  "rejectReason": null,
  "submittedAt": "2026-11-04T00:00:00.000Z",
  "reviewedAt": null,
  "personal": {
    "legalName": "Grace Hopper",
    "dateOfBirth": "1906-12-09",
    "country": "US",
    "documentType": "id_card",
    "documentNumber": "ID-9988"
  },
  "reviewer": null,
  "documents": [
    {
      "id": "…",
      "fileName": "id.png",
      "contentType": "image/png",
      "createdAt": "2026-11-04T00:00:00.000Z",
      "download": { "url": "https://api.example/api/v1/storage/local?token=…", "method": "GET", "expiresInSec": 120 }
    }
  ],
  "history": [
    {
      "id": "…",
      "action": "kyc.create",
      "metadata": { "userId": "…", "level": "advanced" },
      "createdAt": "2026-11-04T00:00:00.000Z",
      "actor": { "id": "…", "email": "root@example.com", "role": "super_admin" }
    }
  ]
}
```

`download.url` 过期后重新请求详情。单独取地址仍可用 `GET /api/v1/kyc/:id/documents/:docId/url`，响应 `{ "documentId", "download" }`。

### `POST /api/v1/kyc/:id/approve`

无 body。只有 `pending` 可以通过。成功后 `status` 为 `approved`。再点一次是 `409 invalid_status`。

### `POST /api/v1/kyc/:id/reject`

```json
{ "reason": "证件四角不完整" }
```

`reason` 去掉空白后 2 到 500 字。缺少原因是 `400 validation_error`。

### `GET /api/v1/kyc/history`

已审核记录，按 `reviewedAt` 从新到旧。不传 `status` 时只含 `approved` 和 `rejected`。

| 查询参数 | 说明 |
| --- | --- |
| `status` | `approved`、`rejected` 或 `pending` |
| `userId` | 只看这个用户 |
| `from` / `to` | 按 `reviewedAt` 的 ISO 时间 |
| `page` / `pageSize` | 分页 |

每一项是队列里的字段，再加上 `reviewer: { id, email, role } | null`。

代建申请是 `POST /api/v1/kyc`，需要 `kyc.create`。上传签名地址是 `POST /api/v1/kyc/:id/documents`，body `{ "fileName", "contentType" }`，`contentType` 只能是 `image/jpeg`、`image/png`、`image/webp`、`application/pdf`。

## 4. 预售账本

需要 `presale.read`。CSV 需要 `presale.export`。`kyc_reviewer` 得到 `403`。确认数阈值是 **15**。少于 15 的转账标为 `pending`，不进已确认合计。默认列表和 CSV 排除它们。加上 `includePending=true` 才会出现，并带 `pending: true` 或 `pendingOnly: true`。只统计打入收款地址的转账。

### `GET /api/v1/presale/summary`

```json
{
  "confirmationThreshold": 15,
  "confirmed": {
    "totalUsdt": "2.5",
    "totalRaw": "2500000000000000000",
    "txCount": 1,
    "subscriberCount": 1,
    "latestTransferAt": "2026-11-02T00:00:00.000Z"
  },
  "pending": {
    "totalUsdt": "6",
    "totalRaw": "6000000000000000000",
    "txCount": 2,
    "subscriberCount": 2
  }
}
```

`totalUsdt` 和后面的 `amount` 是精确的十进制字符串，不是 JavaScript 数字。`totalRaw` / `amountRaw` 是链上最小单位的整数字符串（BSC USDT 为 18 位小数）。合计和导出都用这些字符串，不会改成科学计数法。`pending` 不计入 `confirmed`。

### `GET /api/v1/presale/subscribers`

| 查询参数 | 说明 |
| --- | --- |
| `address` | 可选，精确到一个钱包 |
| `includePending` | `true` 时包含只有未确认转账的地址 |
| `page` / `pageSize` | 分页 |

```json
{
  "address": "0xabab…",
  "totalUsdt": "2.5",
  "totalRaw": "2500000000000000000",
  "txCount": 1,
  "firstTransferAt": "2026-11-02T00:00:00.000Z",
  "lastTransferAt": "2026-11-02T00:00:00.000Z",
  "pendingTxCount": 1,
  "pendingUsdt": "1",
  "pendingRaw": "1000000000000000000",
  "pendingOnly": false
}
```

`pendingTxCount > 0` 时界面可以打「有未确认转账」的标记。`pendingOnly` 表示这个地址还没有任何已确认转账。

### `GET /api/v1/presale/subscribers/:address/transfers`

分页参数同上，另有 `includePending`。响应比通用列表多一个 `address`。每一笔：

```json
{
  "txHash": "0x…",
  "logIndex": 1,
  "fromAddress": "0x…",
  "toAddress": "0x…",
  "amount": "2.5",
  "amountRaw": "2500000000000000000",
  "blockNumber": 101,
  "blockHash": "0x…",
  "blockTime": "2026-11-02T00:00:00.000Z",
  "confirmations": 40,
  "pending": false
}
```

### `GET /api/v1/presale/subscriptions`

单笔列表，不必先按地址汇总。查询参数：`address`、`txHash`、`includePending`、`page`、`pageSize`。字段和上面的转账相同。

### CSV

`GET /api/v1/presale/subscribers.csv` 和 `GET /api/v1/presale/subscriptions.csv`。

- 权限 `presale.export`，并写审计（`presale.subscribers.export` 或 `presale.subscriptions.export`）。
- `Content-Type: text/csv; charset=utf-8`，带 BOM，`Content-Disposition` 为附件。
- 响应是流，不要等全部进内存再交给浏览器。筛选条件和对应的 JSON 列表相同。
- 超过 10 万行返回 `400 export_too_large`，此时还没有开始输出文件。

认购人 CSV 表头：

```text
address,totalUsdt,totalRaw,txCount,firstTransferAt,lastTransferAt,pendingTxCount,pendingUsdt,pendingRaw,pendingOnly
```

转账 CSV 表头：

```text
txHash,logIndex,fromAddress,amount,amountRaw,blockNumber,blockTime,confirmations,pending
```

## 5. 管理员（仅 super_admin）

### `GET /api/v1/admin/admins`

`role`、`status`（`active` 或 `disabled`）、`page`、`pageSize`。

```json
{
  "id": "…",
  "email": "support@example.com",
  "role": "support",
  "status": "active",
  "totpEnabled": true,
  "createdAt": "2026-11-04T00:00:00.000Z",
  "lastLoginAt": null
}
```

不返回密码哈希和 TOTP 种子。

### `POST /api/v1/admin/invites`

和 `POST /api/v1/auth/invites` 相同。

### `PATCH /api/v1/admin/admins/:id`

```json
{ "role": "kyc_reviewer" }
```

`role` 为 `super_admin`、`kyc_reviewer` 或 `support`。成功后该管理员的刷新令牌作废，访问令牌因 `tokenVersion` 变化而立刻 `401`。不能改自己的角色（`409 self_change`）。不能把最后一个活跃超级管理员改成别的角色（`409 last_super_admin`）。角色没变时返回当前对象，不记审计。

### `POST /api/v1/admin/admins/:id/disable`

```json
{ "reason": "left the team" }
```

`reason` 可省略。结果 `status` 为 `disabled`，会话作废。再次禁用以 `409 invalid_status`。不能禁用自己。不能禁用最后一个活跃超级管理员。被禁用的账号登录返回 `403 admin_disabled`。

## 6. 审计

`GET /api/v1/audit`，需要 `audit.read`。三种角色都可以看。

| 查询参数 | 说明 |
| --- | --- |
| `actorId` | 操作者 UUID |
| `action` | 精确动作名，例如 `kyc.reject`、`admin.disable` |
| `targetType` | 例如 `user`、`kyc`、`presale`、`admin` |
| `targetId` | 目标 UUID |
| `from` / `to` | `createdAt` 的 ISO 时间 |
| `page` / `pageSize` | 分页 |

```json
{
  "id": "…",
  "action": "admin.disable",
  "targetType": "admin",
  "targetId": "…",
  "metadata": { "reason": "left the team" },
  "ip": "203.0.113.10",
  "createdAt": "2026-11-04T00:00:00.000Z",
  "actor": { "id": "…", "email": "root@example.com", "role": "super_admin" }
}
```

没有操作者时 `actor` 为 `null`（例如失败的登录）。查询本身也会记一条 `audit.list`。

常见动作：`auth.login.failure`、`auth.mfa.success`、`auth.logout`、`auth.invite.create`、`user.list`、`user.freeze`、`user.unfreeze`、`user.ban`、`kyc.list`、`kyc.read`、`kyc.approve`、`kyc.reject`、`kyc.history`、`presale.summary`、`presale.subscribers.list`、`presale.subscribers.export`、`presale.subscriber.transfers`、`presale.subscriptions.list`、`presale.subscriptions.export`、`admin.list`、`admin.role.update`、`admin.disable`。

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `CSRF_SECRET` | CSRF 的 HMAC 密钥，至少 32 字符。生产必填，不要复用 `JWT_SECRET` |
| `ADMIN_CONSOLE_ORIGIN` | 控制台源，唯一允许的 CORS 来源。决定 Cookie 的 `SameSite` |
| `ADMIN_CORS_ORIGINS` | 仅在上面为空时使用 |
| `ADMIN_IP_ALLOWLIST` | 除 `/health` 外的客户端 IP/CIDR。生产必填，除非下面的开关为 `true` |
| `ADMIN_IP_ALLOWLIST_DISABLED` | 只有精确的 `true` 才关闭限制，并打安全日志 |
| `PUBLIC_BASE_URL` | API 对外地址，生产必须是 `https://`，否则浏览器丢掉 `__Host-` Cookie |
| `TRUST_PROXY_HOPS` | 信任的反向代理层数。允许列表用它算出的客户端 IP |
| `ACCESS_TOKEN_TTL_SEC` | 访问 Cookie 秒数，默认 900 |
| `REFRESH_TOKEN_TTL_DAYS` | 刷新 Cookie 和 CSRF Cookie 天数，默认 7 |

生产环境请同时设置 `CSRF_SECRET`、`ADMIN_CONSOLE_ORIGIN`、`https://` 的 `PUBLIC_BASE_URL`，以及 `ADMIN_IP_ALLOWLIST`。审计表只允许插入。触发器会拒绝 `UPDATE`、`DELETE` 和 `TRUNCATE`。应用数据库角色对这张表只有 `INSERT` 和 `SELECT`，不能关掉触发器。
