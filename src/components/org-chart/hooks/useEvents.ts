import type { Edge, Graph, Node } from '@antv/x6'
import { useNode } from './useNode'
import type { OrgChartData } from '../types'
import { useOrgTreeData, type MovePosition } from './useOrgTreeData'
import { getIntersectionInfo, getQuadrant } from '../utils'

// 从treeData中获取指定parentId下第insertIndex个节点的id以及所有子节点id数组
function getChildNodeIdAtIndex(
  data: OrgChartData,
  parentId: string,
  insertIndex: number,
): { targetNodeId: string | null; childrenIds: string[] } {
  if (parentId === 'root') {
    // 根级只有一个节点
    return {
      targetNodeId: insertIndex === 0 ? data.id : null,
      childrenIds: [data.id],
    }
  }

  // 递归查找父节点
  const findNode = (node: OrgChartData): OrgChartData | null => {
    if (node.id === parentId) return node
    if (node.children) {
      for (const child of node.children) {
        const result = findNode(child)
        if (result) return result
      }
    }
    return null
  }

  const parentNode = findNode(data)
  if (!parentNode?.children) {
    return { targetNodeId: null, childrenIds: [] }
  }

  const childrenIds = parentNode.children.map((child) => child.id)
  return {
    targetNodeId: parentNode.children[insertIndex]?.id || null,
    childrenIds,
  }
}

// 根据相交节点和象限计算移动位置
function calculateMovePosition(
  intersectingNodeId: string,
  sourceNodeId: string,
  quadrant: number,
  findNodeAndParentFn: (
    targetId: string,
  ) => { node: OrgChartData; parent: OrgChartData | null; index: number } | null,
): MovePosition | null {
  // 找到目标节点和其父节点
  const result = findNodeAndParentFn(intersectingNodeId)
  if (!result) return null

  const { node: targetNode, parent: parentNode, index: nodeIndex } = result

  // 找到源节点的当前位置
  const sourceResult = findNodeAndParentFn(sourceNodeId)
  if (!sourceResult) return null

  const { parent: sourceParent, index: sourceIndex } = sourceResult

  switch (quadrant) {
    case 1: // 右上 - 加在当前节点右边（同级）
      if (!parentNode) {
        // 检查源节点是否已经在根节点右边
        if (!sourceParent && sourceIndex === 1) {
          return null // 已经在目标位置，不需要移动
        }
        return {
          targetLevel: 'parent',
          parentId: 'root',
          insertIndex: 1, // 根节点右边
        }
      }

      // 检查源节点是否已经在目标位置（目标节点右边）
      if (sourceParent?.id === parentNode.id && sourceIndex === nodeIndex + 1) {
        return null // 已经在目标位置，不需要移动
      }

      return {
        targetLevel: 'parent',
        parentId: parentNode.id,
        insertIndex: nodeIndex + 1,
      }

    case 2: // 左上 - 加在当前节点左边（同级）
      if (!parentNode) {
        // 检查源节点是否已经在根节点左边
        if (!sourceParent && sourceIndex === 0) {
          return null // 已经在目标位置，不需要移动
        }
        return {
          targetLevel: 'parent',
          parentId: 'root',
          insertIndex: 0, // 根节点左边
        }
      }

      // 检查源节点是否已经在目标位置（目标节点左边）
      if (sourceParent?.id === parentNode.id && sourceIndex === nodeIndex) {
        return null // 已经在目标位置，不需要移动
      }

      return {
        targetLevel: 'parent',
        parentId: parentNode.id,
        insertIndex: nodeIndex,
      }

    case 3: // 左下 - 加在子级最左边
      // 检查源节点是否已经是目标节点的第一个子节点
      if (sourceParent?.id === targetNode.id && sourceIndex === 0) {
        return null // 已经在目标位置，不需要移动
      }

      return {
        targetLevel: 'child',
        parentId: targetNode.id,
        insertIndex: 0,
      }

    case 4: // 右下 - 加在子级最右边
      const childCount = targetNode.children?.length || 0

      // 检查源节点是否已经是目标节点的最后一个子节点
      if (sourceParent?.id === targetNode.id && sourceIndex === childCount - 1) {
        return null // 已经在目标位置，不需要移动
      }

      return {
        targetLevel: 'child',
        parentId: targetNode.id,
        insertIndex: childCount,
      }

    default:
      return null
  }
}

export function setupEventHandlers(graph: Graph, initialData: OrgChartData) {
  const { createGhostNode, createPreviewNode, createPreviewEdge } = useNode()
  const {
    treeData,
    findNodeAndParent,
    moveNode,
    addNode,
    removeNode,
    updateTreeData,
    updateNodeName,
    updateEdgeLabel,
  } = useOrgTreeData(initialData)
  let ghostNode: Node | null = null
  let isDragging = false
  let sourceNode: Node | null = null
  let previewNode: Node | null = null
  let previewEdge: Edge | null = null
  let mouseDownPosition: { x: number; y: number } | null = null
  const DRAG_THRESHOLD = 5 // 拖拽阈值，移动超过5px才认为是拖拽

  // 节流优化：减少昂贵的相交检测计算
  let lastIntersectionCheck = 0
  const INTERSECTION_CHECK_INTERVAL = 16 // ~60fps

  // 公共清理逻辑
  const handleMouseUpCleanup = () => {
    graph.enablePanning()

    if (isDragging && sourceNode) {
      // 检查是否有pending的移动操作
      const allData = sourceNode.getData()
      const pendingMove = allData?.pendingMove as MovePosition | undefined

      if (pendingMove) {
        // 清理pending数据（先清理，避免产生额外的历史记录）
        const currentData = sourceNode.getData()
        if (currentData) {
          delete currentData.pendingMove
          sourceNode.setData(currentData, { silent: true }) // silent: true 避免产生历史记录
        }

        // 执行移动操作，让后续的渲染产生历史记录
        moveNode(sourceNode.id, pendingMove)
      }

      // 清理幽灵节点
      if (ghostNode) {
        ghostNode.remove()
        ghostNode = null
      }

      // 清理预览节点
      if (previewNode) {
        previewNode.remove()
        previewNode = null
      }
      if (previewEdge) {
        previewEdge.remove()
        previewEdge = null
      }
    }

    isDragging = false
    sourceNode = null
    mouseDownPosition = null
  }

  graph.on('cell:mousedown', ({ e, cell }) => {
    if (cell.isNode()) {
      // 记录鼠标按下位置和源节点，但不立即开始拖拽
      const { clientX, clientY } = e
      mouseDownPosition = { x: clientX, y: clientY }
      sourceNode = cell as Node
      graph.disablePanning()
    }
  })

  graph.on('cell:mousemove', ({ e, cell }) => {
    if (cell.isNode() && sourceNode && mouseDownPosition) {
      const { clientX, clientY } = e
      const deltaX = Math.abs(clientX - mouseDownPosition.x)
      const deltaY = Math.abs(clientY - mouseDownPosition.y)

      // 只有移动距离超过阈值才开始拖拽
      if (!isDragging && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
        isDragging = true
      }

      if (isDragging) {
        e.stopPropagation()
        // 如果还没有创建幽灵节点，创建一个
        if (!ghostNode) {
          ghostNode = createGhostNode(graph, sourceNode)
        }

        // 更新幽灵节点位置跟随鼠标
        if (ghostNode) {
          const localPoint = graph.clientToLocal(clientX, clientY)
          ghostNode.setPosition(
            localPoint.x - ghostNode.size().width / 2,
            localPoint.y - ghostNode.size().height / 2,
          )

          // 节流相交检测，避免过于频繁的计算
          const now = Date.now()
          if (now - lastIntersectionCheck >= INTERSECTION_CHECK_INTERVAL) {
            lastIntersectionCheck = now

            // 检测与幽灵节点相交的节点
            const ghostBBox = ghostNode.getBBox()
            const intersectingNodes = graph
              .getNodesInArea(ghostBBox)
              .filter((node) => node !== sourceNode && node !== ghostNode)

            if (intersectingNodes.length > 0) {
              // 计算每个相交节点的相交面积和区域信息
              const nodesWithIntersection = intersectingNodes.map((node) => {
                const nodeBBox = node.getBBox()
                const intersectionInfo = getIntersectionInfo(ghostBBox, nodeBBox)

                // 计算节点中心点
                const nodeCenter = {
                  x: nodeBBox.x + nodeBBox.width / 2,
                  y: nodeBBox.y + nodeBBox.height / 2,
                }

                // 计算相交区域中心点在节点的第几象限
                const quadrant = getQuadrant(intersectionInfo.center, nodeCenter)

                return {
                  node,
                  ...intersectionInfo,
                  id: node.id,
                  data: node.getData(),
                  nodeCenter,
                  quadrant,
                }
              })

              // 找出相交面积最大的节点
              const maxAreaNode = nodesWithIntersection.reduce((max, current) =>
                current.area > max.area ? current : max,
              )

              // 计算移动位置
              const movePosition = calculateMovePosition(
                maxAreaNode.id,
                sourceNode.id,
                maxAreaNode.quadrant,
                findNodeAndParent,
              )

              if (movePosition) {
                const parentNode = graph.getCellById(movePosition.parentId) as Node
                const { targetNodeId, childrenIds } = getChildNodeIdAtIndex(
                  treeData.value!,
                  movePosition.parentId,
                  movePosition.insertIndex,
                )

                // 将要加入的位置已经有节点了
                if (targetNodeId) {
                  const targetNode = graph.getCellById(targetNodeId!) as Node
                  const { x, y } = targetNode?.position()
                  previewNode = createPreviewNode(graph, previewNode, x - 60, y - 10)
                } else {
                  // 将要加入的位置没有节点
                  if (childrenIds.length === 0) {
                    // 没有任何子节点，加下面
                    const { x, y } = parentNode.position()
                    previewNode = createPreviewNode(graph, previewNode, x + 10, y + 120)
                  } else {
                    // 有子节点，加最后面
                    const lastChildId = childrenIds[childrenIds.length - 1]
                    const lastChildNode = graph.getCellById(lastChildId) as Node
                    const { x, y } = lastChildNode.position()
                    previewNode = createPreviewNode(graph, previewNode, x + 100, y - 10)
                  }
                }
                previewEdge = createPreviewEdge(graph, previewEdge, previewNode, parentNode)

                // 暂存移动信息，在mouseup时执行
                sourceNode.setData({ pendingMove: movePosition }, { silent: true })
              }
            } else {
              // 没有相交节点时，清除之前的movePosition和预览节点
              const currentData = sourceNode.getData()
              if (currentData?.pendingMove) {
                delete currentData.pendingMove
                sourceNode.setData(currentData, { silent: true })
              }

              // 清理预览节点
              if (previewNode) {
                previewNode.remove()
                previewNode = null
              }
              if (previewEdge) {
                previewEdge.remove()
                previewEdge = null
              }
            }
          }
        }
      }
    }
  })

  graph.on('cell:mouseup', ({ e, cell }) => {
    if (cell.isNode() && sourceNode) {
      if (isDragging) {
        // 如果是拖拽操作，执行拖拽清理逻辑
        e.stopPropagation()
        handleMouseUpCleanup()
      } else {
        // 如果不是拖拽（简单点击），手动触发点击事件

        // 清理状态
        graph.enablePanning()
        sourceNode = null
        mouseDownPosition = null
      }
    }
  })

  // 添加全局mouseup事件，确保在画布空白处释放也能清理
  graph.on('blank:mouseup', () => {
    handleMouseUpCleanup()
  })

  // 监听节点添加事件
  graph.on('node:add', ({ e, node }: { e: Event; node: Node }) => {
    e.stopPropagation()
    // 为新节点生成唯一ID
    const newNodeId = `${Math.random().toString(36).substring(2, 11)}`

    // 创建新节点数据
    const newNodeData: OrgChartData = {
      id: newNodeId,
      name: '新节点',
      edgeLabel: '0%',
      children: [],
    }

    // 添加到当前节点的子级最后面
    const movePosition: MovePosition = {
      targetLevel: 'child',
      parentId: node.id,
      insertIndex: -1,
    }

    // 执行添加操作
    const success = addNode(newNodeData, movePosition)

    if (success) {
      console.log('✅ 新节点添加成功:', newNodeData)
    }
  })

  graph.bindKey('delete', (e: KeyboardEvent) => {
    e.preventDefault()

    const selectedCells = graph.getSelectedCells()
    if (selectedCells.length > 0) {
      removeNode(selectedCells[0].id)
    }
    return false
  })

  // 监听节点属性变化，同步节点名称到 treeData
  graph.on('node:change:attrs', ({ node }) => {
    const newName = node.getAttrByPath('.name/text')
    if (newName && typeof newName === 'string') {
      updateNodeName(node.id, newName)
    }
  })

  // 监听边标签变化，同步边标签到 treeData
  graph.on('edge:change:labels', ({ edge }) => {
    const labels = edge.getLabels()
    // console.log(labels)
    if (labels && labels.length > 0) {
      // 获取标签文本
      const labelText = labels[0].attrs?.label?.text || labels[0].attrs?.text?.text
      // console.log('labelText:', labelText)
      if (labelText && typeof labelText === 'string') {
        updateEdgeLabel(edge.id, labelText)
      }
    }
  })

  // 返回响应式tree数据，供外部监听
  return {
    treeData,
    updateTreeData,
  }
}
