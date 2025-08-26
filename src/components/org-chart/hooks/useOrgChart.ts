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
  console.log('🔍 [rebuildTreeDataFromGraph] 开始重建树形数据')
  const nodes = graph.getNodes()
  const edges = graph.getEdges()
  console.log('🔍 [rebuildTreeDataFromGraph] 节点数量:', nodes.length, '边数量:', edges.length)

  if (nodes.length === 0) {
    console.log('❌ [rebuildTreeDataFromGraph] 没有节点，返回null')
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

  console.log('🔍 [rebuildTreeDataFromGraph] 根节点ID:', rootNodeId)
  console.log('🔍 [rebuildTreeDataFromGraph] 父子关系映射:', Array.from(childrenMap.entries()))

  if (!rootNodeId) {
    console.error('❌ [rebuildTreeDataFromGraph] 无法找到根节点')
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

  const result = buildOrderedTree(rootNodeId)
  console.log('✅ [rebuildTreeDataFromGraph] 按位置排序重建完成:', JSON.stringify(result, null, 2))
  return result
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
      console.log('📋 [History] Undo事件触发')
      console.log('📋 [History] 当前历史状态:', {
        canUndo: graphInstance.canUndo(),
        canRedo: graphInstance.canRedo(),
        undoStackSize: graphInstance.getUndoStackSize(),
        redoStackSize: graphInstance.getRedoStackSize(),
        historyStackSize: graphInstance.getHistoryStackSize(),
      })
      if (onTreeDataSync) {
        isProcessingHistory = true // 标记正在处理历史操作
        const rebuiltData = rebuildTreeDataFromGraph(graphInstance)
        if (rebuiltData) {
          console.log('🔄 [History] Undo: 正在同步树形数据...')
          onTreeDataSync(rebuiltData)
        }
        // 延迟重置标记，确保渲染完成
        setTimeout(() => {
          isProcessingHistory = false
        }, 100)
      }
    })

    // 监听 redo 事件
    graphInstance.on('history:redo', () => {
      console.log('📋 [History] Redo事件触发')
      console.log('📋 [History] 当前历史状态:', {
        canUndo: graphInstance.canUndo(),
        canRedo: graphInstance.canRedo(),
        undoStackSize: graphInstance.getUndoStackSize(),
        redoStackSize: graphInstance.getRedoStackSize(),
        historyStackSize: graphInstance.getHistoryStackSize(),
      })
      if (onTreeDataSync) {
        isProcessingHistory = true // 标记正在处理历史操作
        const rebuiltData = rebuildTreeDataFromGraph(graphInstance)
        if (rebuiltData) {
          console.log('🔄 [History] Redo: 正在同步树形数据...')
          onTreeDataSync(rebuiltData)
        }
        // 延迟重置标记，确保渲染完成
        setTimeout(() => {
          isProcessingHistory = false
        }, 100)
      }
    })

    // 监听历史记录变化
    graphInstance.on('history:add', ({ cmds }) => {
      console.log('📝 [History] 新增历史记录:', {
        commandCount: cmds.length,
        undoStackSize: graphInstance.getUndoStackSize(),
        redoStackSize: graphInstance.getRedoStackSize(),
      })
    })

    // 监听历史记录清空
    graphInstance.on('history:clean', () => {
      console.log('🧹 [History] 历史记录被清空')
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
    console.log(
      '🎨 [renderData] 开始渲染，firstRender:',
      firstRender,
      'isProcessingHistory:',
      isProcessingHistory,
    )

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

      // 如果正在处理历史操作，临时禁用历史记录
      const wasHistoryEnabled = graph.value?.isHistoryEnabled()
      if (isProcessingHistory && wasHistoryEnabled) {
        console.log('🚫 [renderData] 临时禁用历史记录，避免干扰undo/redo')
        graph.value?.disableHistory()
      }

      graph.value?.batchUpdate(() => {
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
      })

      // 恢复历史记录状态
      if (isProcessingHistory && wasHistoryEnabled) {
        console.log('✅ [renderData] 重新启用历史记录')
        graph.value?.enableHistory()
      }
    }

    console.log('✅ [renderData] 渲染完成')
  }

  return {
    initialize,
    renderData,
    setTreeDataSyncCallback,
  }
}
