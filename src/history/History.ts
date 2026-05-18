import { config } from '../config'

export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export interface HistoryActions<T> {
  push(state: T): void
  undo(): T | null
  redo(): T | null
  canUndo(): boolean
  canRedo(): boolean
  getCurrent(): T
}

export function createHistory<T>(initial: T, maxSize = config.history.maxSize): HistoryActions<T> {
  const history: HistoryState<T> = {
    past: [],
    present: initial,
    future: [],
  }

  return {
    push(state: T) {
      history.past.push(history.present)
      if (history.past.length > maxSize) {
        history.past.shift()
      }
      history.present = state
      history.future = []
    },

    undo(): T | null {
      if (history.past.length === 0) return null
      history.future.push(history.present)
      history.present = history.past.pop()!
      return history.present
    },

    redo(): T | null {
      if (history.future.length === 0) return null
      history.past.push(history.present)
      history.present = history.future.pop()!
      return history.present
    },

    canUndo() {
      return history.past.length > 0
    },

    canRedo() {
      return history.future.length > 0
    },

    getCurrent() {
      return history.present
    },
  }
}
