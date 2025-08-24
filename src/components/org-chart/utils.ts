export function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.toString.call(obj) === '[object Object]'
  )
}

export function mergeConfig<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target
  const source = sources.shift()

  if (isPlainObject(target) && isPlainObject(source)) {
    for (const key in source) {
      if (isPlainObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        mergeConfig(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>)
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }

  return mergeConfig(target, ...sources)
}
