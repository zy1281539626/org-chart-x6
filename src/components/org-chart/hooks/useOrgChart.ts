import { ref } from 'vue'
import { Edge, Graph, Node } from '@antv/x6'
import Hierarchy from '@antv/hierarchy'
import type { HierarchyResult, OrgChartConfig } from '../types'
import { useNode } from './useNode'
import { mergeConfig } from '../utils'
import defaultConfig from '../config'
import { useEdge } from './useEdge'

function renderTree(treeData: unknown, config: Partial<OrgChartConfig>) {
  const { createNodeMeta } = useNode()
  const { createEdgeMeta } = useEdge()

  const result = Hierarchy.compactBox(treeData, {
    direction: 'TB',
    getWidth() {
      return config.nodeWidth
    },
    getHeight() {
      return config.nodeHeight
    },
    getHGap() {
      return config.nodeHGap
    },
    getVGap() {
      return config.nodeVGap
    },
  })

  const cellsData: (Node.Metadata | Edge.Metadata)[] = []

  const traverse = (data: HierarchyResult, isRoot: boolean = false) => {
    if (data) {
      cellsData.push(createNodeMeta(data, isRoot))
    }
    if (data.children) {
      data.children.forEach((item: HierarchyResult) => {
        cellsData.push(createEdgeMeta(data, item))
        traverse(item, false) // 子节点不是根节点
      })
    }
  }
  traverse(result, true) // 最顶层节点是根节点
  return cellsData
}

export function useOrgChart(config: Partial<OrgChartConfig> = {}) {
  const graph = ref<Graph | null>(null)
  const { registerNode } = useNode()
  const { registerEdge } = useEdge()

  const fullConfig = mergeConfig(defaultConfig, config) as Required<OrgChartConfig>

  // 初始化
  const initialize = (container: HTMLElement) => {
    // 注册自定义节点
    registerNode(fullConfig.nodeWidth, fullConfig.nodeHeight)
    registerEdge()
    // 创建图实例
    const graphInstance = new Graph({
      container,
      autoResize: true,
      width: fullConfig.width,
      height: fullConfig.height,
      grid: true,
      background: {
        color: fullConfig.background || '#F3F7FF',
      },
      panning: { enabled: true },
      mousewheel: { enabled: true, zoomAtMousePosition: false },
      interacting: {
        nodeMovable: false,
        edgeMovable: false,
      },
    })

    graph.value = graphInstance

    return graphInstance
  }
  // 渲染数据
  const renderData = (treeData: unknown, firstRender = false) => {
    const graphData = renderTree(treeData, fullConfig)
    // console.log(graphData)
    if (firstRender) {
      graph.value?.fromJSON(graphData)
    } else {
      const currentEdges = graph.value?.getEdges()
      console.log('currentEdges:', currentEdges)

      graph.value?.batchUpdate(() => {
        graphData.forEach((cellData) => {
          const cell = graph.value?.getCellById(cellData.id)
          if (cell) {
            // 处理节点更新
            if (cell.isNode() && 'x' in cellData && 'y' in cellData) {
              const node = cell as Node
              const currentPos = node.getPosition()
              console.log(
                `Node ${cellData.id}: ${currentPos.x},${currentPos.y} → ${cellData.x},${cellData.y}`,
              )

              // 更新节点位置 - 使用 position 设置绝对位置
              node.position(cellData.x!, cellData.y!)

              // 更新节点数据
              if ('data' in cellData) {
                node.setData(cellData.data)
              }
            }

            // 处理边更新
            if (cell.isEdge()) {
              const edge = cell as Edge
              console.log('edge:', edge)
            }
          }
        })
      })
    }
  }

  return {
    initialize,
    renderData,
  }
}
