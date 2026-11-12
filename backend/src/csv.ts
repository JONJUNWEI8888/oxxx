const FORMULA_PREFIX = /^[=+\-@\t\r]/

/**
 * CSV cell. Text from outside the process (addresses, names, notes, hashes) gets a leading
 * quote when it could be an Excel formula. Amounts we format ourselves stay numeric.
 */
export function csvCell(value: string, kind: 'text' | 'number' = 'text'): string {
  const guarded = kind === 'number' ? value : guardFormula(value)
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`
  return guarded
}

function guardFormula(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value
}
