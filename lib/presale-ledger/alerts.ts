export type AlertSeverity = 'info' | 'warning' | 'critical'

export type Alert = {
  severity: AlertSeverity
  title: string
  message: string
  details?: Record<string, unknown>
}

/** Plug in Slack, PagerDuty, email, etc. by implementing this and passing it to reconciliation. */
export interface AlertChannel {
  readonly name: string
  send(alert: Alert): Promise<void>
}

export class LogAlertChannel implements AlertChannel {
  readonly name = 'log'

  constructor(private readonly sink: Pick<Console, 'error' | 'warn'> = console) {}

  async send(alert: Alert): Promise<void> {
    const line = JSON.stringify({ source: 'presale-reconciliation', at: new Date().toISOString(), ...alert })
    if (alert.severity === 'critical') this.sink.error(line)
    else this.sink.warn(line)
  }
}

export class WebhookAlertChannel implements AlertChannel {
  readonly name = 'webhook'

  constructor(
    private readonly url: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(alert: Alert): Promise<void> {
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'presale-reconciliation', at: new Date().toISOString(), ...alert }),
    })
    if (!res.ok) throw new Error(`Alert webhook failed with HTTP ${res.status}`)
  }
}

export class FanoutAlertChannel implements AlertChannel {
  readonly name = 'fanout'

  constructor(private readonly channels: AlertChannel[]) {}

  async send(alert: Alert): Promise<void> {
    if (this.channels.length === 0) return
    const results = await Promise.allSettled(this.channels.map((channel) => channel.send(alert)))
    const failures = results.flatMap((result, index) =>
      result.status === 'rejected' ? [`${this.channels[index]?.name ?? index}: ${String(result.reason)}`] : [],
    )
    if (failures.length > 0) throw new Error(`Alert delivery failed: ${failures.join('; ')}`)
  }
}

export function createAlertChannel(
  env: NodeJS.ProcessEnv | { PRESALE_ALERT_CHANNELS?: string; PRESALE_ALERT_WEBHOOK_URL?: string },
  fetchImpl: typeof fetch = fetch,
): AlertChannel {
  const names = (env.PRESALE_ALERT_CHANNELS ?? 'log,webhook')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  const channels: AlertChannel[] = []
  for (const name of names) {
    if (name === 'log') channels.push(new LogAlertChannel())
    else if (name === 'webhook' && env.PRESALE_ALERT_WEBHOOK_URL) {
      channels.push(new WebhookAlertChannel(env.PRESALE_ALERT_WEBHOOK_URL, fetchImpl))
    }
  }
  return new FanoutAlertChannel(channels)
}
