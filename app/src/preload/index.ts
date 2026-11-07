// Safe bridge between the UI and the main process. The UI never gets Node.js access.
import { contextBridge, ipcRenderer } from 'electron'
import type { AosApi } from '@shared/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const on = (channel: string) => (cb: (payload: any) => void) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listener = (_e: Electron.IpcRendererEvent, payload: any): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: AosApi = {
  info: () => ipcRenderer.invoke('app:info'),
  listRoots: () => ipcRenderer.invoke('roots:list'),
  addRoots: () => ipcRenderer.invoke('roots:add'),
  removeRoot: (id) => ipcRenderer.invoke('roots:remove', id),
  rescan: (id) => ipcRenderer.invoke('roots:rescan', id),
  search: (q) => ipcRenderer.invoke('search', q),
  getSound: (id) => ipcRenderer.invoke('sound:get', id),
  getPeaks: (id) => ipcRenderer.invoke('sound:peaks', id),
  setFavorite: (id, fav) => ipcRenderer.invoke('sound:favorite', id, fav),
  reveal: (id) => ipcRenderer.send('sound:reveal', id),
  startDrag: (id) => ipcRenderer.send('drag:start', id),
  indexStatus: () => ipcRenderer.invoke('index:status'),
  aiStatus: () => ipcRenderer.invoke('ai:status'),
  installAi: () => ipcRenderer.invoke('ai:install'),
  stemsStatus: () => ipcRenderer.invoke('stems:status'),
  installStems: () => ipcRenderer.invoke('stems:install'),
  splitStems: (id) => ipcRenderer.invoke('stems:split', id),
  getStems: (id) => ipcRenderer.invoke('stems:get', id),
  dragStems: (id, stem) => ipcRenderer.send('stems:drag', id, stem ?? null),
  revealPath: (p) => ipcRenderer.send('stems:reveal', p),
  onStemsStatus: on('stems:status'),
  onIndexStatus: on('index:status'),
  onAiStatus: on('ai:status'),
  onLibraryChanged: on('library:changed') as AosApi['onLibraryChanged']
}

contextBridge.exposeInMainWorld('aos', api)

// Used only by the hidden decoder page.
contextBridge.exposeInMainWorld('aosDecoder', {
  onRequest: (cb: (req: { reqId: number; id: number; kind?: string }) => void) =>
    ipcRenderer.on('decode:request', (_e, req) => cb(req)),
  reply: (res: { reqId: number; windows?: Float32Array[]; left?: Float32Array; right?: Float32Array; error?: string }) =>
    ipcRenderer.send('decode:result', res)
})
