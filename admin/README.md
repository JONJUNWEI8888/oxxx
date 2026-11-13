# OXXX 管理后台（前端）

独立 Next.js 应用，部署为单独的 Vercel 项目，域名例如 `admin.oxxx.io`。接口说明见 [docs/admin-api.md](../docs/admin-api.md)。

浏览器直接请求 API，并带上 `credentials: 'include'`。会话是 API 主机上的 HttpOnly Cookie。本应用不读取、不保存、也不转发响应体里的访问令牌或刷新令牌。变更请求一律是 `Content-Type: application/json`，并带上 `GET /api/v1/auth/csrf` 返回的 `X-CSRF-Token`。路径使用文档里的规范形式，不做百分号编码。

本地把控制台和 API 都放在 `localhost`。API 设置 `ADMIN_CONSOLE_ORIGIN=http://localhost:3001`。

```bash
pnpm install
pnpm --filter @oxxx/admin-console dev
```

生产环境把 Vercel 的 Root Directory 设为 `admin`，构建时提供 `NEXT_PUBLIC_ADMIN_API_BASE_URL`。CSP 的 `connect-src` 只放这个源。

权限按钮只看 `GET /api/v1/auth/me` 的 `permissions`。401 会尝试用 Cookie 刷新一次；403 原样展示；429 和带 `Retry-After` 的 503 显示「请稍后重试」。

`GET /api/v1/presale/subscriptions` 在金额的 Decimal 被打印成科学计数法时会返回 500（`present()` 对 `1e+21` 调用 `BigInt`）。认购人汇总接口不受影响。本应用没有改后端。
