import { Edge, Graph } from '@antv/x6'
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
        // 移除默认的 edge-editor 工具，避免意外触发
        tools: [
          {
            name: 'edge-editor',
            args: {
              labelAddable: false,
              attrs: {
                fontSize: 14,
              },
              getText: ({ cell }: { cell: Edge }) => {
                const labels = cell.getLabels()
                if (labels && labels.length > 0) {
                  return labels[0].attrs?.label?.text || ''
                }
                return ''
              },
              setText: ({ cell, value }: { cell: Edge; value: string }) => {
                if (value) {
                  const labels = cell.getLabels()
                  const label = labels?.[0].attrs?.label?.text
                  if (label && label !== value) {
                    const newLabels = labels.map((label) => ({
                      ...label,
                      attrs: {
                        ...label.attrs,
                        label: { ...label.attrs?.label, text: value },
                      },
                    }))
                    cell.setLabels(newLabels)
                  }
                }
              },
            },
          },
        ],
      },
      true,
    )
  }

  const createEdgeMeta = (source: HierarchyResult, target: HierarchyResult) => {
    const edgeLabel = target.data.edgeLabel || '关系'

    return {
      id: `edge-${source.id}#${target.id}`,
      shape: 'org-edge',
      source: `${source.id}`,
      target: `${target.id}`,
      labels: [
        {
          attrs: {
            label: {
              text: edgeLabel,
              textVerticalAnchor: 'middle',
            },
          },
          position: {
            distance: 1,
            offset: { x: 40, y: -15 },
          },
        },
      ],
      connector: { name: 'normal' },
      router: {
        name: 'manhattan',
        args: {
          startDirections: ['top', 'bottom'],
          endDirections: ['top', 'bottom'],
          padding: {
            vertical: 20,
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
