import { ref } from 'vue'
import { Edge, Graph, Node } from '@antv/x6'
import { Selection } from '@antv/x6-plugin-selection'
import { Keyboard } from '@antv/x6-plugin-keyboard'
// import type { Attr } from '@antv/x6/lib/registry'
import Hierarchy from '@antv/hierarchy'
import type { HierarchyResult, OrgChartConfig } from '../types'
import { useNode } from './useNode'
import { getDifference, mergeConfig } from '../utils'
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
    graphInstance.use(
      new Keyboard({
        enabled: true,
        global: false, // 绑定到容器而不是全局
      }),
    )
    graphInstance.use(
      new Selection({
        enabled: true,
        multiple: false,
        showNodeSelectionBox: true,
      }),
    )

    // 确保容器可以获得焦点，否则不可以delete
    container.setAttribute('tabindex', '0')

    graph.value = graphInstance

    return graphInstance
  }
  // 渲染数据
  const renderData = (treeData: unknown, firstRender = false) => {
    const graphData = renderTree(treeData, fullConfig)
    if (firstRender) {
      // 初始化渲染
      graph.value?.fromJSON(graphData)
    } else {
      // 更新渲染
      const currentEdges = graph.value?.getEdges()
      const currentEdgeIds = currentEdges?.map((edge) => edge.id) || []
      const newEdgeIds = graphData
        .filter((item) => item.shape === 'org-edge')
        .map((item) => item.id)
      const deleteEdges = getDifference(currentEdgeIds, newEdgeIds)
      
      // 处理节点删除
      const currentNodes = graph.value?.getNodes()
      const currentNodeIds = currentNodes?.map((node) => node.id) || []
      const newNodeIds = graphData
        .filter((item) => item.shape === 'org-node')
        .map((item) => item.id)
      const deleteNodes = getDifference(currentNodeIds, newNodeIds)
      
      // 删除边
      deleteEdges.map((edgeId) => {
        graph.value?.removeEdge(edgeId)
      })
      
      // 删除节点
      deleteNodes.map((nodeId) => {
        graph.value?.removeNode(nodeId)
      })

      graph.value?.batchUpdate(() => {
        graphData.forEach((cellData) => {
          const cell = graph.value?.getCellById(cellData.id)
          if (cell) {
            // 节点更新
            if (cell.isNode() && 'x' in cellData && 'y' in cellData) {
              const node = cell as Node
              node.position(cellData.x!, cellData.y!)
              if ('data' in cellData) {
                node.setData(cellData.data)
              }
            }
          } else {
            // 新增节点或边
            if (cellData.shape === 'org-node') {
              graph.value?.addNode(cellData as Node.Metadata)
            } else if (cellData.shape === 'org-edge') {
              graph.value?.addEdge(cellData as Edge.Metadata)
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
