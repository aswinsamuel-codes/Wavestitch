import type { StemFile, StemStatus } from '@shared/types'
import { fmtBytes } from '../format'

interface Props {
  soundId: number
  isStemFile: boolean
  status: StemStatus
  files: StemFile[] | null
  onInstall(): void
  onSplit(): void
  onOpenInSession(): void
}

export const STEM_COLORS: Record<string, string> = { Vocals: '#e8789a', Drums: '#f2b33d', Bass: '#6fcf97', Other: '#8ab4f8' }
const COLORS = STEM_COLORS

export function StemsPanel({ soundId, isStemFile, status, files, onInstall, onSplit, onOpenInSession }: Props) {
  const job = status.job?.soundId === soundId ? status.job : null
  const queued = status.queue.includes(soundId)

  let body
  if (isStemFile && !files) {
    body = <span className="dim">This file is already a stem. Drag it into your DAW.</span>
  } else if (files) {
    body = (
      <>
        <div className="stem-row">
          {files.map((f) => (
            <div
              key={f.stem}
              className="stem-chip"
              style={{ borderColor: COLORS[f.stem], color: COLORS[f.stem] }}
              draggable
              onDragStart={(e) => {
                e.preventDefault()
                window.aos.dragStems(soundId, f.stem)
              }}
              onDoubleClick={() => window.aos.revealPath(f.path)}
              title={`Drag ${f.stem} into your DAW · ${fmtBytes(f.sizeBytes)} · double-click to show the file`}
            >
              ⠿ {f.stem}
            </div>
          ))}
        </div>
        <div
          className="drag-chip all-stems"
          draggable
          onDragStart={(e) => {
            e.preventDefault()
            window.aos.dragStems(soundId)
          }}
          title="Drag all 4 stems at once: your DAW creates one track per stem"
        >
          ⠿ Drag all 4 stems to DAW
        </div>
        <button
          className="btn session-btn"
          onClick={onOpenInSession}
          disabled={files.some((f) => !f.soundId)}
          title={files.some((f) => !f.soundId) ? 'Stems are still being indexed…' : 'Open the stems as synced tracks (with mute/solo) in the Session view'}
        >
          ▤ Open stems in Session
        </button>
      </>
    )
  } else if (job) {
    const pct = Math.round(job.progress * 100)
    body = (
      <div className="stem-progress">
        <div className="bar">
          <div className="fill" style={{ width: `${job.phase === 'decoding' ? 3 : Math.max(3, pct)}%` }} />
        </div>
        <span className="pulse">
          {job.phase === 'decoding' ? 'Preparing audio…' : `Separating… ${pct}%`}
          {job.etaSec != null && job.phase === 'separating' && job.progress < 1 && ` · ~${Math.max(1, Math.round(job.etaSec / 60))} min left`}
        </span>
      </div>
    )
  } else if (queued) {
    body = <span className="dim">Waiting in queue…</span>
  } else if (status.state === 'not-installed' || status.state === 'error') {
    body = (
      <>
        {status.state === 'error' && <p className="err">{status.message}</p>}
        <button className="btn" onClick={onInstall}>
          Install stem splitter (~{status.downloadMb ?? 166} MB)
        </button>
      </>
    )
  } else if (status.state === 'downloading') {
    body = <span className="pulse">{status.message ?? 'Downloading…'}</span>
  } else {
    body = (
      <button className="btn" onClick={onSplit} disabled={status.state !== 'ready' && status.state !== 'splitting'}>
        ✂ Split into Vocals · Drums · Bass · Other
      </button>
    )
  }

  return (
    <div className="stems-panel">
      <div className="stems-title">Stems</div>
      {body}
      {status.message && status.state !== 'error' && status.state !== 'downloading' && !job && <p className="err small">{status.message}</p>}
    </div>
  )
}
