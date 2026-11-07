// Simple file log: <userData>/logs/main.log (rotated at 5 MB). Captures main-process console output,
// uncaught errors and warnings/errors from the app windows.
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { APP_NAME } from '@shared/brand'

let file: string | null = null

export function initLog(dataDir: string): string {
  const dir = join(dataDir, 'logs')
  mkdirSync(dir, { recursive: true })
  file = join(dir, 'main.log')
  try {
    if (existsSync(file) && statSync(file).size > 5 * 1024 * 1024) renameSync(file, join(dir, 'main.old.log'))
  } catch {
    /* ignore */
  }
  for (const level of ['log', 'warn', 'error'] as const) {
    const orig = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      orig(...args)
      write(level === 'log' ? 'info' : level, format(...args))
    }
  }
  process.on('uncaughtException', (e) => write('fatal', String(e?.stack ?? e)))
  process.on('unhandledRejection', (e) => write('error', `unhandled rejection: ${String((e as Error)?.stack ?? e)}`))
  write('info', `---- ${APP_NAME} started (pid ${process.pid}, ${process.platform}, node ${process.versions.node}, electron ${process.versions.electron})`)
  return file
}

export function write(level: string, msg: string): void {
  if (!file) return
  try {
    appendFileSync(file, `${new Date().toISOString()} [${level}] ${msg}\n`)
  } catch {
    /* never crash because of logging */
  }
}

/** Forward a window's console warnings/errors into the log. */
export function captureConsole(name: string, wc: Electron.WebContents): void {
  wc.on('console-message', (...args: unknown[]) => {
    // Electron ≥ 35 passes a details object; older versions pass positional arguments.
    const e = args[0] as { level?: string | number; message?: string }
    const level = e?.level ?? args[1]
    const message = e?.message ?? (args[2] as string)
    const isProblem = level === 'warning' || level === 'error' || level === 2 || level === 3
    if (isProblem) write(`${name}:${level}`, String(message))
  })
  wc.on('render-process-gone', (_e, d) => write('error', `${name} renderer gone: ${d.reason} (exit ${d.exitCode})`))
  wc.on('unresponsive', () => write('warn', `${name} window unresponsive`))
}
