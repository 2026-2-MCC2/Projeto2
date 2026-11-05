// Conta tentativas por chave (ex.: IP + rota) em janelas fixas de tempo, só na memória da instância.
// A primeira tentativa abre a janela; ao fim dela a contagem recomeça do zero.

export class RateLimiter {
  constructor({ maxHits, windowSeconds }) {
    this.maxHits = maxHits
    this.windowMs = windowSeconds * 1000
    this.windowsByKey = new Map()

    // limpa as janelas vencidas de quem não voltou, para a memória não crescer sem fim;
    // unref para o timer não segurar o desligamento da aplicação
    setInterval(() => this.removeExpired(), this.windowMs).unref()
  }

  // segundos até a chave poder tentar de novo; 0 quando ainda está dentro do limite
  secondsUntilAllowed(key) {
    const window = this.currentWindow(key)
    if (window === null || window.hits < this.maxHits) return 0
    return Math.ceil((window.resetAt - Date.now()) / 1000)
  }

  hit(key) {
    let window = this.currentWindow(key)
    if (window === null) {
      window = { hits: 0, resetAt: Date.now() + this.windowMs }
      this.windowsByKey.set(key, window)
    }
    window.hits++
  }

  reset(key) {
    this.windowsByKey.delete(key)
  }

  currentWindow(key) {
    const window = this.windowsByKey.get(key)
    if (window === undefined) return null
    if (window.resetAt <= Date.now()) {
      this.windowsByKey.delete(key)
      return null
    }
    return window
  }

  removeExpired() {
    const now = Date.now()
    for (const [key, window] of this.windowsByKey) {
      if (window.resetAt <= now) this.windowsByKey.delete(key)
    }
  }
}
