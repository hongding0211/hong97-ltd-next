type Event = {
  toast: {
    msg: string
    type?: 'error' | 'success'
  }
}

class Emitter<K extends keyof Event> {
  private events: Partial<Record<K, ((args?: Event[K]) => void)[]>> = {}

  on(event: K, callback: (args?: Event[K]) => void) {
    this.events[event] = this.events[event] || []
    this.events[event].push(callback)
  }

  emit(event: K, args?: Event[K]) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(args))
    }
  }

  off(event: K) {
    if (this.events[event]) {
      this.events[event] = []
    }
  }
}

export const emitter = new Emitter()
