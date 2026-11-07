import type { AiStatus, LibraryRoot } from '@shared/types'
import { nf } from '../format'

export type Scope = { kind: 'all' } | { kind: 'fav' } | { kind: 'root'; id: number }

interface Props {
  roots: LibraryRoot[]
  scope: Scope
  total: number
  ai: AiStatus
  onScope(s: Scope): void
  onAdd(): void
  onRemove(id: number): void
  onRescan(id: number): void
  onInstallAi(): void
}

export function Sidebar({ roots, scope, total, ai, onScope, onAdd, onRemove, onRescan, onInstallAi }: Props) {
  const is = (s: Scope) =>
    s.kind === scope.kind && (s.kind !== 'root' || (scope.kind === 'root' && s.id === scope.id))
  return (
    <aside className="sidebar">
      <div className="side-section">
        <div className="side-title">Library</div>
        <div className={`side-item ${is({ kind: 'all' }) ? 'active' : ''}`} onClick={() => onScope({ kind: 'all' })}>
          <span className="ico">♫</span> All Sounds <span className="count">{nf.format(total)}</span>
        </div>
        <div className={`side-item ${is({ kind: 'fav' }) ? 'active' : ''}`} onClick={() => onScope({ kind: 'fav' })}>
          <span className="ico">★</span> Favourites
        </div>
      </div>

      <div className="side-section grow">
        <div className="side-title">
          Folders
          <button className="mini-btn" onClick={onAdd} title="Add sound folders">
            ＋
          </button>
        </div>
        {roots.length === 0 && <div className="side-empty">No folders yet</div>}
        {roots.map((r) => (
          <div
            key={r.id}
            className={`side-item folder ${is({ kind: 'root', id: r.id }) ? 'active' : ''} ${r.online ? '' : 'offline'}`}
            onClick={() => onScope({ kind: 'root', id: r.id })}
            title={r.online ? r.path : `${r.path} (offline: drive not connected)`}
          >
            <span className="ico">{r.online ? '▸' : '⏏'}</span>
            <span className="label">{r.label}</span>
            <span className="count">{nf.format(r.count)}</span>
            <span className="row-actions">
              <button className="mini-btn" title="Rescan" onClick={(e) => (e.stopPropagation(), onRescan(r.id))}>
                ↻
              </button>
              <button
                className="mini-btn"
                title="Remove from library (files are not deleted)"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Remove "${r.label}" from the library?\n\nYour files stay on disk; only the index is removed.`)) onRemove(r.id)
                }}
              >
                ✕
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className={`ai-card state-${ai.state}`}>
        <div className="ai-head">
          <span className="ai-badge">AI</span> Sound search
        </div>
        {ai.state === 'not-installed' && (
          <>
            <p>Describe a sound ("distant thunder rumble") and find similar sounds. Runs offline on your computer.</p>
            <button className="btn primary" onClick={onInstallAi}>
              Install AI model (~{ai.downloadMb ?? 155} MB)
            </button>
          </>
        )}
        {(ai.state === 'downloading' || ai.state === 'loading') && (
          <p className="pulse">{ai.message ?? 'Loading AI model…'}</p>
        )}
        {ai.state === 'ready' && (
          <p>
            Ready · {nf.format(ai.embedded)} analysed
            {ai.pending > 0 && <> · {nf.format(ai.pending)} waiting</>}
          </p>
        )}
        {ai.state === 'error' && (
          <>
            <p className="err">AI could not start: {ai.message}</p>
            <button className="btn" onClick={onInstallAi}>
              Try again
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
