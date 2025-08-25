import type { Rectangle } from '@antv/x6'

// 是否是纯对象
export function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.toString.call(obj) === '[object Object]'
  )
}

// 合并对象
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

// 计算两个矩形的相交面积和相交区域信息
export function getIntersectionInfo(bbox1: Rectangle, bbox2: Rectangle) {
  const left = Math.max(bbox1.x, bbox2.x)
  const right = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width)
  const top = Math.max(bbox1.y, bbox2.y)
  const bottom = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height)

  if (left < right && top < bottom) {
    const area = (right - left) * (bottom - top)
    const centerX = (left + right) / 2
    const centerY = (top + bottom) / 2

    return {
      area,
      center: { x: centerX, y: centerY },
      bounds: { left, right, top, bottom },
    }
  }

  return {
    area: 0,
    center: { x: 0, y: 0 },
    bounds: { left: 0, right: 0, top: 0, bottom: 0 },
  }
}

// 判断点相对于节点中心的象限
export function getQuadrant(
  point: { x: number; y: number },
  nodeCenter: { x: number; y: number },
): number {
  const dx = point.x - nodeCenter.x
  const dy = point.y - nodeCenter.y

  if (dx > 0 && dy < 0) return 1 // 右上
  if (dx < 0 && dy < 0) return 2 // 左上
  if (dx < 0 && dy > 0) return 3 // 左下
  if (dx > 0 && dy > 0) return 4 // 右下

  return 0 // 在中心点
}
