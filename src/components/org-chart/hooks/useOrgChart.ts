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
  const renderData = (treeData: unknown) => {
    const graphData = renderTree(treeData, fullConfig)
    graph.value?.fromJSON(graphData)
  }

  return {
    initialize,
    renderData,
  }
}
