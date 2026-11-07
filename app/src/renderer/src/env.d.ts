/// <reference types="vite/client" />
import type { AosApi } from '@shared/types'

declare global {
  interface Window {
    aos: AosApi
  }
}

export {}
