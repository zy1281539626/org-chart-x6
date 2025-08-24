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
        name: 'er',
        args: { offset: 'center' },
      },
    }
  }

  return {
    registerEdge,
    createEdgeMeta,
  }
}
