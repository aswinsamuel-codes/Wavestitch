// Virtualised results table (handles 100k+ rows). Rows can be dragged straight into a DAW.
import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Sound, SortKey } from '@shared/types'
import { fmtChannels, fmtDuration, fmtFormat, stem } from '../format'

interface Props {
  items: Sound[]
  selectedId: number | null
  rootLabels: Map<number, string>
  sort: SortKey
  onSort(s: SortKey): void
  onSelect(id: number, play: boolean): void
  onActivate(id: number): void
  onToggleFavorite(id: number, fav: boolean): void
}

const ROW = 26

export function SoundList({ items, selectedId, rootLabels, sort, onSort, onSelect, onActivate, onToggleFavorite }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const v = useVirtualizer({ count: items.length, getScrollElement: () => scroller.current, estimateSize: () => ROW, overscan: 20 })

  useEffect(() => {
    if (selectedId == null) return
    const idx = items.findIndex((s) => s.id === selectedId)
    if (idx >= 0) v.scrollToIndex(idx, { align: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const head = (key: SortKey | null, label: string, cls: string) => (
    <div
      className={`th ${cls} ${key ? 'sortable' : ''} ${key && sort === key ? 'sorted' : ''}`}
      onClick={() => key && onSort(sort === key ? 'relevance' : key)}
    >
      {label}
      {key && sort === key && <span className="sort-ind">▾</span>}
    </div>
  )

  return (
    <div className="list">
      <div className="thead">
        {head(null, '', 'c-fav')}
        {head('name', 'Name', 'c-name')}
        {head('duration', 'Length', 'c-dur')}
        {head(null, 'Format', 'c-fmt')}
        {head(null, 'Ch', 'c-ch')}
        {head(null, 'UCS', 'c-ucs')}
        {head('folder', 'Location', 'c-loc')}
      </div>
      <div className="tbody" ref={scroller} tabIndex={-1}>
        <div style={{ height: v.getTotalSize(), position: 'relative' }}>
          {v.getVirtualItems().map((vr) => {
            const s = items[vr.index]
            const sel = s.id === selectedId
            const folder = s.relPath.includes('/') ? s.relPath.slice(0, s.relPath.lastIndexOf('/')) : ''
            return (
              <div
                key={s.id}
                className={`tr ${sel ? 'selected' : ''} ${vr.index % 2 ? 'odd' : ''}`}
                style={{ transform: `translateY(${vr.start}px)`, height: ROW }}
                draggable
                onDragStart={(e) => {
                  e.preventDefault()
                  onSelect(s.id, false)
                  window.aos.startDrag(s.id)
                }}
                onMouseDown={(e) => e.button === 0 && onSelect(s.id, true)}
                onDoubleClick={() => onActivate(s.id)}
                title={s.description ?? s.filename}
              >
                <div
                  className={`td c-fav ${s.favorite ? 'on' : ''}`}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    onToggleFavorite(s.id, !s.favorite)
                  }}
                >
                  {s.favorite ? '★' : '☆'}
                </div>
                <div className="td c-name">
                  <span className="fname">{stem(s.filename)}</span>
                  {s.description && <span className="desc">{s.description}</span>}
                </div>
                <div className="td c-dur mono">{fmtDuration(s.durationMs)}</div>
                <div className="td c-fmt">{fmtFormat(s)}</div>
                <div className="td c-ch">{fmtChannels(s.channels)}</div>
                <div className="td c-ucs">{s.ucsCat ?? ''}</div>
                <div className="td c-loc">
                  <span className="root-tag">{rootLabels.get(s.rootId) ?? ''}</span> {folder}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
