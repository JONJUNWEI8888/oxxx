/** Whether GET /api/presale can be drawn. `ready` is true once the indexer cursor has passed the start block. */
export function presaleSummaryVisible(body: { ready?: unknown; raised?: unknown; hardCapUsdt?: unknown }): boolean {
  return (
    body.ready === true &&
    typeof body.raised === 'number' &&
    Number.isFinite(body.raised) &&
    body.raised >= 0 &&
    typeof body.hardCapUsdt === 'number' &&
    Number.isFinite(body.hardCapUsdt) &&
    body.hardCapUsdt > 0
  )
}
