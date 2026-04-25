function writeJsonLine(write, payload) {
  if (typeof write !== "function") {
    return
  }

  write(JSON.stringify(payload))
}

export function createOperationalLogEventWriter({
  info = console.info,
  warn = console.warn,
  now = () => new Date().toISOString(),
} = {}) {
  return (event) => {
    if (!event || typeof event !== "object") {
      return
    }

    const category = typeof event.category === "string" ? event.category : "workflow"
    const write = category === "security" ? warn : info

    writeJsonLine(write, {
      timestamp: now(),
      ...event,
    })
  }
}
