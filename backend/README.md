# OXXX 管理后台（v1）

管理后台是一个独立的 Node.js 服务，负责管理员登录、用户账户、KYC 审核、审计日志，以及预售认购记录的查询和导出。交易所前台（Next.js）继续部署在 Vercel，本服务不替换现有页面。

## 为什么是独立服务

前台已经是 Vercel 上的 Next.js。KYC 文件、Argon2id、数据库迁移和可恢复的链上索引更适合常驻进程，而不是塞进页面用的 Serverless 函数。因此：

- **管理 API** 在本目录，Fastify + TypeScript + PostgreSQL（Prisma）。
- **预售公开接口** 仍是前台的 `GET /api/presale` 和 `GET /api/presale/subscribers/:address`，这样首页不用改地址。
- **两边共用** 仓库根目录的 `prisma/schema.prisma` 和同一个 Postgres。

预售金额不再读取收款地址的原始 USDT 余额。余额任何人转入都会变大，而且没有认购人。v1 改为索引打进收款地址的 BEP-20 `Transfer` 事件。字段说明见 [docs/presale-api.md](../docs/presale-api.md)。首页现在只用 `raised` 和 `updatedAt`，多出来的字段不会破坏现有页面。

## 本地启动

在仓库根目录把 `.env.example` 抄成 `.env`，填上 `POSTGRES_PASSWORD`、`JWT_SECRET`、`PII_ENCRYPTION_KEY`、`ADMIN_EMAIL`、`ADMIN_PASSWORD`、`ADMIN_TOTP_SECRET`、`CRON_SECRET`。这些值不会写进 compose 文件；缺任何一个，`docker compose` 会直接拒绝启动。

```bash
docker compose up --build
```

这会启动 Postgres（只绑定 **127.0.0.1:5433**）和管理 API（<http://localhost:4000>）。`DATABASE_URL` 里的密码若包含 `@ : / ? #` 等保留字符，必须先做百分号编码。直接把端口映射到本机时 `TRUST_PROXY_HOPS` 保持 `0`，忽略客户端自带的 `X-Forwarded-For`。前面只有一层反向代理时设为 `1`。

- 健康检查：`GET /health`
- OpenAPI 界面：<http://localhost:4000/docs>
- 规格文件：`backend/openapi.json`

容器启动时会执行 `prisma migrate deploy`，再按环境变量幂等创建超级管理员。种子管理员的 TOTP 必须已经在 `ADMIN_TOTP_SECRET` 里，密码登录不能再绑定动态码。之后的管理员由超级管理员发一次性邀请链接，在链接里设置密码并绑定 TOTP。

只要索引历史数据，而不是只靠定时增量：

```bash
docker compose --profile indexer up --build
```

`indexer` 会循环扫描，追上安全头之后每 15 秒再扫一次。

不使用 Docker 时，先准备 Postgres，复制 `backend/.env.example`，然后：

```bash
pnpm install
pnpm db:migrate
pnpm --filter @oxxx/admin seed
pnpm --filter @oxxx/admin dev
```

测试：

```bash
# 需要一个名字里带 oxxx_test 的 Postgres
DATABASE_URL=postgresql://oxxx:oxxx@localhost:5432/oxxx_test pnpm test
```

## 生产数据库角色

迁移用表的所有者连接（`DATABASE_MIGRATION_URL`）。跑着的 API 用另一个角色 `oxxx_app`（`DATABASE_URL`）。`oxxx_app` 不是所有者，所以不能 `DROP` 或 `DISABLE` 触发器。其它业务表可以增删改查。`audit_logs` 只有 `INSERT` 和 `SELECT`。`UPDATE`、`DELETE`、`TRUNCATE` 会被触发器拒绝。

生产环境必须设置 `APP_DB_PASSWORD`。没有它时进程拒绝启动，不会退回用表的所有者跑 API。开发和测试可以不设，这时仍用迁移用的那个角色。容器启动时，入口脚本先用所有者跑 `prisma migrate deploy` 和 `backend/src/scripts/ensure-app-role.ts`，种子数据也用所有者写入，然后再切回 `DATABASE_URL` 启动进程。不用镜像入口时，在迁移之后用所有者执行：

```bash
# 把 prisma/production-app-role.sql 里的 CHANGE_ME 换成应用密码。
# 角色已经存在时，改用文件里注释着的 ALTER ROLE。
psql "$DATABASE_MIGRATION_URL" -f prisma/production-app-role.sql
```

测试清库的账号是表的所有者。它会先 `DISABLE TRIGGER audit_logs_no_truncate`，再 `TRUNCATE`，最后把触发器打开。触发器开着的时候，`TRUNCATE audit_logs` 会失败。

## 认证和权限

密码使用 Argon2id。登录成功后不会直接发访问令牌：

1. `POST /api/v1/auth/login` 校验密码。未完成邀请注册的账号返回 `enrollment_required`，不会发绑定令牌。
2. `POST /api/v1/auth/mfa` 提交 6 位动态码。失败次数记在账号上，重新登录不会清零；连续 5 次锁定 15 分钟。用过的时间步会记下来，同一动态码不能再用。
3. `POST /api/v1/auth/refresh` 轮换刷新令牌。`POST /api/v1/auth/logout` 撤销这次会话，已经发出的访问令牌马上不能再用。
4. `POST /api/v1/auth/invites` 由超级管理员创建一次性邀请。`POST /api/v1/auth/invites/start` 展示 TOTP，`POST /api/v1/auth/invites/redeem` 设置密码并完成绑定。

密码失败按 **IP + 账号** 计数，并随次数变慢。只知道邮箱不能把管理员从别的 IP 锁死。同一 IP 的总失败次数另有上限。失败次数用数据库里的原子自增，锁定与否看自增后的返回值。TOTP 时间步用带条件的 `updateMany` 抢占，同一动态码并发提交只有一次成功。客户端 IP 只取 Fastify 按 `TRUST_PROXY_HOPS` 算出的 `request.ip`，不直接读 `X-Forwarded-For`。

登录、MFA、邀请打开和邀请绑定还经过 Upstash（`@upstash/ratelimit`）的分布式限流。Redis 调用失败时这些接口 **失败关闭**：返回 `503`，并带 `Retry-After`，不会退回进程内计数。公开的预售查询接口不同：Redis 失败时打一条警告日志，改用本进程内的限流继续服务。生产环境如果没有配置 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`，两类接口都返回 503。本地开发和测试没有这两项配置时使用内存限流。限流器按名称只创建一次。

| 权限 | super_admin | kyc_reviewer | support |
| --- | --- | --- | --- |
| 用户列表、详情、精确搜索（support 只看打码后的邮箱和手机） | 是 | 是 | 是 |
| 创建用户、代建 KYC、上传证件 | 是 | | |
| 冻结 / 解冻 | 是 | | 是 |
| 封禁 | 是 | | |
| KYC 队列、详情、下载证件、通过 / 拒绝 | 是 | 是 | |
| 审计查询 | 是 | 是 | 是 |
| 预售认购列表和 CSV | 是 | | 是 |

用户邮箱和手机号、KYC 个人资料、管理员 TOTP 种子用 AES-256-GCM 加密后入库。邮箱和手机号另存 HMAC 盲索引，因此搜索是**精确匹配**，不能模糊搜索。审计日志不记录证件号码。

## 主要接口

除健康检查、登录、MFA、邀请打开/绑定和带签名的对象存储地址外，请求要带 `Authorization: Bearer <accessToken>`，或带登录时写下的 HttpOnly Cookie。Cookie 的变更请求还要带 `X-CSRF-Token`。细节见 [docs/admin-api.md](../docs/admin-api.md)。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | 密码 |
| POST | `/api/v1/auth/mfa` | TOTP |
| POST | `/api/v1/auth/invites` | 超级管理员创建一次性邀请 |
| POST | `/api/v1/auth/invites/start` | 打开邀请，拿到 TOTP |
| POST | `/api/v1/auth/invites/redeem` | 设置密码并完成绑定 |
| POST | `/api/v1/auth/refresh` | 刷新 |
| POST | `/api/v1/auth/logout` | 登出 |
| GET | `/api/v1/auth/me` | 当前管理员、角色和权限 |
| GET | `/api/v1/auth/csrf` | 用 Cookie 换回 CSRF 明文 |
| GET | `/api/v1/admin/admins` | 超级管理员列出管理员 |
| POST | `/api/v1/admin/invites` | 同上，创建邀请 |
| PATCH | `/api/v1/admin/admins/:id` | 修改角色，旧会话失效 |
| POST | `/api/v1/admin/admins/:id/disable` | 禁用管理员 |
| GET | `/api/v1/users` | `status`、`kycStatus`、创建时间、邮箱或手机精确搜索、分页 |
| POST | `/api/v1/users` | 运营代建用户。交易站注册是 v2 |
| GET | `/api/v1/users/:id` | 详情，含最近一条 KYC 状态 |
| POST | `/api/v1/users/:id/freeze` | 仅 `active` → `frozen` |
| POST | `/api/v1/users/:id/unfreeze` | 仅 `frozen` → `active` |
| POST | `/api/v1/users/:id/ban` | `active` 或 `frozen` → `banned` |
| GET | `/api/v1/kyc` | `status`、`level`、分页 |
| POST | `/api/v1/kyc` | 代建申请 |
| GET | `/api/v1/kyc/:id` | 个人资料、短时证件 URL、审核记录 |
| GET | `/api/v1/kyc/history` | 已审核记录。默认不含 `pending` |
| POST | `/api/v1/kyc/:id/approve` | 仅 `pending` |
| POST | `/api/v1/kyc/:id/reject` | body `{ "reason": "..." }`，必填 |
| POST | `/api/v1/kyc/:id/documents` | 返回短时上传地址 |
| GET | `/api/v1/kyc/:id/documents/:docId/url` | 返回短时下载地址 |
| GET | `/api/v1/audit` | `actorId`、`action`、`targetType`、`targetId`、时间范围、分页 |
| GET | `/api/v1/presale/summary` | 已确认与未满 15 确认的合计 |
| GET | `/api/v1/presale/subscribers` | 按地址汇总。默认不含只有未确认转账的地址 |
| GET | `/api/v1/presale/subscribers/:address/transfers` | 该地址的转账 |
| GET | `/api/v1/presale/subscribers.csv` | 流式 CSV，最多 10 万行 |
| GET | `/api/v1/presale/subscriptions` | `address`、`txHash`、分页。默认不含未满 15 确认 |
| GET | `/api/v1/presale/subscriptions.csv` | 流式 CSV，同一过滤条件，最多 10 万行 |
| POST | `/api/v1/internal/presale/index` | `Authorization: Bearer $CRON_SECRET` |
| POST | `/api/v1/internal/presale/reconcile` | 同上 |

错误体为 `{ "error": { "code", "message" } }`。浏览器会话、CSRF、权限字段和给前端的字段说明见 [docs/admin-api.md](../docs/admin-api.md)。CORS 在设置了 `ADMIN_CONSOLE_ORIGIN` 时只反射这一个来源；否则才使用 `ADMIN_CORS_ORIGINS`。生产环境如果 `ADMIN_IP_ALLOWLIST` 为空且没有把 `ADMIN_IP_ALLOWLIST_DISABLED` 设成精确的 `true`，进程拒绝启动。Cookie 名称固定为 `__Host-`，响应 JSON 不返回访问令牌或刷新令牌。

KYC 证件默认存在本机 `var/storage`，通过 HMAC 签名地址读写，没有公开列表。生产把 `STORAGE_DRIVER=s3`，并设置 `S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`。接口只返回预签名 URL，桶本身不公开。

## 预售索引怎么跑

收款地址和 USDT 合约在 `lib/presale.ts`。索引器只记录 **打入** 该地址的 Transfer，确认数达到 **15** 个区块才入账。游标和检查点写在 Postgres，不放内存。同一 `(txHash, logIndex)` 重复扫描会更新而不会插两次。若已扫描区块的哈希和链上不一致，就删掉分叉点之后的记录并重扫。

每次调用只前进一步（默认最多 5000 个区块、20 秒），所以中断后下次从游标继续。

生产建议：

1. **回填**：在能访问 Postgres 和 BSC RPC 的机器上跑 `docker compose --profile indexer up`，或在前台仓库执行 `pnpm presale:index --loop`。第一次运行前设置 `PRESALE_INDEX_START_BLOCK` 为收款地址开始收 USDT 的区块。不设置的话，索引从当前安全头开始，历史认购不会出现。
2. **保持增量**：前台项目在 Vercel 上。`vercel.json` 每 5 分钟请求 `GET /api/cron/presale-index`，每天 02:15 UTC 请求 `GET /api/cron/presale-reconcile`。Vercel 会带上 `Authorization: Bearer $CRON_SECRET`。在 Vercel 项目里配置 `DATABASE_URL`、`CRON_SECRET`、`PRESALE_INDEX_START_BLOCK`。Hobby 计划的 Cron 可能一天只跑一次，追块会很慢，回填仍应使用上面的常驻 worker。Pro 计划可以按 `vercel.json` 的频率跑。
3. 也可以由外部定时器调用管理服务的 `/api/v1/internal/presale/index`，请求头同样是 `CRON_SECRET`。

对账比较「从起始区块到游标的链上余额变化」和账本合计。起始区块之前的余额算在期初里，不算差异。有人从收款地址转走 USDT 时两边会不一致，默认写日志；设置 `PRESALE_ALERT_WEBHOOK_URL` 后同时 POST JSON。要换 Slack、PagerDuty 或其他通道，实现 `lib/presale-ledger/alerts.ts` 里的 `AlertChannel` 并传给 `runPresaleReconciliation`。

公开接口（给进度条和「我的认购」）：

- `GET /api/presale`：`raised` 是已确认转入的 USDT 合计，`raisedRaw` 是 18 位精度的原始整数，`progress` / `progressPercent` 相对 3000 万硬顶，`subscriberCount` 是去重付款地址数，`synced: false` 表示还在回填，数字不完整。
- `GET /api/presale/subscribers/0x…`：该地址的合计和最近若干笔。没有记录时返回 0，不是 404。

两个接口都有大约 10 秒缓存，并按 IP 限流。限流走 Upstash；Redis 出错时公开查询退回本进程内存并写警告日志。缓存命中时不再打 RPC；RPC 只发生在索引和对账。节点返回 HTTP 错误、JSON-RPC error 或无法解析的结果时会换下一个节点，不会把坏数据当成 0。

## v2 还没做

- 把现有登录 / 注册 / 交易页接到用户体系，用户自行提交 KYC
- 加密字段的模糊搜索，以及 TOTP 恢复码
- 把登录失败的 Postgres 计数也换成与 Upstash 同一套策略的多副本视图（现在密码失败次数已在 Postgres 里原子自增，分布式闸门在 Redis）
- 收款地址转出的账务处理，避免归集资金时对账告警
- 管理界面本身
- 密钥轮换和证件病毒扫描
