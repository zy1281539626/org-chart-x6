import { Graph } from '@antv/x6'
import type { HierarchyResult } from '../types'

export function useEdge() {
  const registerEdge = () => {
    Graph.registerEdge(
      'org-edge',
      {
        zIndex: -1,
        attrs: {
          line: {
            strokeWidth: 2,
            stroke: '#999999',
            sourceMarker: null,
            targetMarker: null,
          },
        },
      },
      true,
    )
  }

  const createEdgeMeta = (source: HierarchyResult, target: HierarchyResult) => {
    return {
      id: `edge-${source.id}-${target.id}`,
      shape: 'org-edge',
      source: `${source.id}`,
      target: `${target.id}`,
      connector: { name: 'normal' },
      router: {
        name: 'manhattan',
        args: {
          startDirections: ['top', 'bottom'], // 只允许上下连接
          endDirections: ['top', 'bottom'], // 只允许上下连接
          padding: {
            vertical: 20, // 垂直线距离
          },
        },
      },
    }
  }

  return {
    registerEdge,
    createEdgeMeta,
  }
}
