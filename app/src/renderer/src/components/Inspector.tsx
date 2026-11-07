import type { SoundDetail, StemFile, StemStatus } from '@shared/types'
import { fmtBytes, fmtChannels, fmtDuration, fmtFormat } from '../format'
import { StemsPanel } from './StemsPanel'

interface Props {
  sound: SoundDetail | null
  isMac: boolean
  aiReady: boolean
  stemsDir: string
  stemStatus: StemStatus
  stemFiles: StemFile[] | null
  onFavorite(fav: boolean): void
  onSimilar(): void
  onInstallStems(): void
  onSplitStems(): void
  onAddToSession(): void
  onOpenStemsInSession(): void
}

function Row({ k, v }: { k: string; v: unknown }) {
  if (v == null || v === '') return null
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{String(v)}</span>
    </div>
  )
}

export function Inspector({
  sound,
  isMac,
  aiReady,
  stemsDir,
  stemStatus,
  stemFiles,
  onFavorite,
  onSimilar,
  onInstallStems,
  onSplitStems,
  onAddToSession,
  onOpenStemsInSession
}: Props) {
  if (!sound) return <div className="inspector empty">Select a sound to see its details.</div>
  const m = sound.metadata as {
    bext?: { description?: string; originator?: string; originationDate?: string; originatorReference?: string }
    ixml?: Record<string, string>
    info?: Record<string, string>
    title?: string
    artist?: string
    codec?: string
  }
  return (
    <div className="inspector">
      <div className="insp-actions">
        <div
          className="drag-chip"
          draggable
          onDragStart={(e) => {
            e.preventDefault()
            window.aos.startDrag(sound.id)
          }}
          title="Drag into Logic Pro, Pro Tools, Reaper, FL Studio…"
        >
          ⠿ Drag to DAW
        </div>
        <button className={`btn ${sound.favorite ? 'on' : ''}`} onClick={() => onFavorite(!sound.favorite)} title="Favourite (F)">
          {sound.favorite ? '★' : '☆'}
        </button>
        <button className="btn" onClick={onSimilar} disabled={!aiReady || !sound.hasEmbedding} title="More like this (M)">
          More like this
        </button>
        <button className="btn" onClick={onAddToSession} title="Add this sound as a track in the Session view (A)">
          ＋ Session
        </button>
        <button className="btn" onClick={() => window.aos.reveal(sound.id)} title="Show file">
          {isMac ? 'Show in Finder' : 'Show in Explorer'}
        </button>
      </div>
      <StemsPanel
        soundId={sound.id}
        isStemFile={!!stemsDir && sound.path.toLowerCase().startsWith(stemsDir.toLowerCase())}
        status={stemStatus}
        files={stemFiles}
        onInstall={onInstallStems}
        onSplit={onSplitStems}
        onOpenInSession={onOpenStemsInSession}
      />
      <div className="insp-grid">
        <Row k="File" v={sound.filename} />
        <Row k="Length" v={fmtDuration(sound.durationMs)} />
        <Row k="Format" v={fmtFormat(sound)} />
        <Row k="Channels" v={fmtChannels(sound.channels)} />
        <Row k="Size" v={fmtBytes(sound.sizeBytes)} />
        <Row k="UCS" v={sound.ucsCat} />
        <Row k="Description" v={sound.description} />
        <Row k="Title" v={m.title} />
        <Row k="Artist" v={m.artist} />
        <Row k="Originator" v={m.bext?.originator} />
        <Row k="Recorded" v={m.bext?.originationDate} />
        <Row k="Keywords" v={m.info?.IKEY} />
        <Row k="Project" v={m.ixml?.project} />
        <Row k="Scene / Take" v={m.ixml?.scene ? `${m.ixml.scene} / ${m.ixml.take ?? ''}` : undefined} />
        <Row k="Tracks" v={m.ixml?.track_names} />
        <Row k="Codec" v={m.codec} />
        <Row k="Location" v={sound.path} />
      </div>
    </div>
  )
}
