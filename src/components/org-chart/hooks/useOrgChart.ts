import { ref } from 'vue'
import { Edge, Graph, Node } from '@antv/x6'
import { Selection } from '@antv/x6-plugin-selection'
import { Keyboard } from '@antv/x6-plugin-keyboard'
import { Export } from '@antv/x6-plugin-export'
import { History } from '@antv/x6-plugin-history'
import Hierarchy from '@antv/hierarchy'
import type { HierarchyResult, OrgChartConfig, OrgChartData } from '../types'
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

// [撤销/重做]从X6图形状态重建树形数据结构
function rebuildTreeDataFromGraph(graph: Graph): OrgChartData | null {
  const nodes = graph.getNodes()
  const edges = graph.getEdges()

  if (nodes.length === 0) {
    return null
  }

  // 构建父子关系映射
  const nodeMap = new Map<string, Node>()
  const childrenMap = new Map<string, string[]>()
  let rootNodeId: string | null = null

  // 初始化映射
  nodes.forEach((node) => {
    nodeMap.set(node.id, node)
    childrenMap.set(node.id, [])
  })

  // 构建父子关系
  edges.forEach((edge) => {
    const sourceId = edge.getSourceCellId()
    const targetId = edge.getTargetCellId()
    if (sourceId && targetId) {
      const children = childrenMap.get(sourceId) || []
      children.push(targetId)
      childrenMap.set(sourceId, children)
    }
  })

  // 找到根节点（没有入边的节点）
  const hasParent = new Set(edges.map((edge) => edge.getTargetCellId()).filter(Boolean))
  for (const node of nodes) {
    if (!hasParent.has(node.id)) {
      rootNodeId = node.id
      break
    }
  }

  if (!rootNodeId) {
    console.error('❌ 无法找到根节点')
    return null
  }

  // 根据节点的X坐标对同级子节点进行排序
  const sortChildrenByPosition = (childrenIds: string[]): string[] => {
    return childrenIds.sort((a, b) => {
      const nodeA = nodeMap.get(a)
      const nodeB = nodeMap.get(b)
      if (!nodeA || !nodeB) return 0

      const posA = nodeA.position()
      const posB = nodeB.position()

      // 按X坐标从左到右排序
      return posA.x - posB.x
    })
  }

  // 递归构建有序的树形结构
  const buildOrderedTree = (nodeId: string): OrgChartData => {
    const node = nodeMap.get(nodeId)
    const nodeData = node?.getData() || {}
    const childrenIds = childrenMap.get(nodeId) || []

    // 对子节点按位置排序
    const sortedChildrenIds = sortChildrenByPosition(childrenIds)

    return {
      id: nodeId,
      name: nodeData.name || '节点',
      children: sortedChildrenIds.map((childId) => buildOrderedTree(childId)),
    }
  }

  return buildOrderedTree(rootNodeId)
}

export function useOrgChart(config: Partial<OrgChartConfig> = {}) {
  const graph = ref<Graph | null>(null)
  const { registerNode } = useNode()
  const { registerEdge } = useEdge()

  const fullConfig = mergeConfig(defaultConfig, config) as Required<OrgChartConfig>

  // 数据同步回调函数
  let onTreeDataSync: ((data: OrgChartData) => void) | null = null
  // 标记是否正在处理历史操作
  let isProcessingHistory = false

  // 设置数据同步回调
  const setTreeDataSyncCallback = (callback: (data: OrgChartData) => void) => {
    onTreeDataSync = callback
  }

  // 设置历史事件处理器
  const setupHistorySyncHandlers = (graphInstance: Graph) => {
    // 监听 undo 事件
    graphInstance.on('history:undo', () => {
      if (onTreeDataSync) {
        isProcessingHistory = true
        const rebuiltData = rebuildTreeDataFromGraph(graphInstance)
        if (rebuiltData) {
          onTreeDataSync(rebuiltData)
        }
        setTimeout(() => {
          isProcessingHistory = false
        }, 100)
      }
    })

    // 监听 redo 事件
    graphInstance.on('history:redo', () => {
      if (onTreeDataSync) {
        isProcessingHistory = true
        const rebuiltData = rebuildTreeDataFromGraph(graphInstance)
        if (rebuiltData) {
          onTreeDataSync(rebuiltData)
        }
        setTimeout(() => {
          isProcessingHistory = false
        }, 100)
      }
    })

    // 监听节点编辑器开始事件
    graphInstance.on('node:editor:open', ({ cell }) => {
      if (cell.isNode()) {
        console.log('📝 Node-editor: 开始编辑节点', cell.id)
      }
    })

    // 监听节点编辑器关闭事件
    graphInstance.on('node:editor:close', ({ cell }) => {
      if (cell.isNode()) {
        console.log('📝 Node-editor: 编辑完成节点', cell.id)

        // if (onTreeDataSync && !isProcessingHistory) {
        //   const rebuiltData = rebuildTreeDataFromGraph(graphInstance)
        //   if (rebuiltData) {
        //     // 设置标志，避免 watch 触发渲染
        //     isProcessingHistory = true
        //     onTreeDataSync(rebuiltData)
        //     setTimeout(() => {
        //       isProcessingHistory = false
        //     }, 50)
        //   }
        // }
      }
    })

    // 备用方案：监听属性变化，但排除正在编辑的节点
    graphInstance.on('node:change:attrs', ({ node, current, previous }) => {
      // console.log('🔍 属性变化调试:', {
      //   nodeId: node.id,
      //   editingNodeId,
      //   isEditing: editingNodeId === node.id,
      //   currentText: current['.name']?.text,
      //   previousText: previous?.['.name']?.text,
      // })
    })
  }

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
        global: false,
      }),
    )
    graphInstance.use(
      new Selection({
        enabled: true,
        multiple: false,
        movable: false,
        showNodeSelectionBox: true,
      }),
    )
    graphInstance.use(new Export())
    graphInstance.use(
      new History({
        enabled: true,
        stackSize: 10,
      }),
    )

    // 确保容器可以获得焦点，否则不可以delete
    container.setAttribute('tabindex', '0')

    graph.value = graphInstance

    // 设置历史事件处理器
    setupHistorySyncHandlers(graphInstance)

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

      // 历史记录管理：只在处理历史操作（undo/redo）时禁用历史记录
      // 正常的移动操作应该产生历史记录
      const wasHistoryEnabled = graph.value?.isHistoryEnabled()
      const shouldDisableHistory = isProcessingHistory && wasHistoryEnabled

      if (shouldDisableHistory) {
        graph.value?.disableHistory()
      }

      // 删除边
      deleteEdges.map((edgeId) => {
        graph.value?.removeEdge(edgeId)
      })
      // 删除节点
      deleteNodes.map((nodeId) => {
        graph.value?.removeNode(nodeId)
      })

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

      // 恢复历史记录状态
      if (shouldDisableHistory) {
        graph.value?.enableHistory()
      }
    }
  }

  return {
    initialize,
    renderData,
    setTreeDataSyncCallback,
  }
}
