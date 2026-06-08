export function throttle<T extends (...args: any[]) => void>(callback: T, wait = 100) {
  let lastRun = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const run = () => {
    lastRun = Date.now()
    timeoutId = null
    if (lastArgs) {
      callback(...lastArgs)
      lastArgs = null
    }
  }

  const throttled = (...args: Parameters<T>) => {
    const remaining = wait - (Date.now() - lastRun)
    lastArgs = args

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      run()
      return
    }

    if (!timeoutId) {
      timeoutId = setTimeout(run, remaining)
    }
  }

  throttled.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = null
    lastArgs = null
  }

  return throttled
}
