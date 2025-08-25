import type { Graph, Node } from '@antv/x6'
import { useNode } from './useNode'
import type { OrgChartData } from '../types'
import { useOrgTreeData, type MovePosition } from './useOrgTreeData'
import { getIntersectionInfo, getQuadrant } from '../utils'

// 根据相交节点和象限计算移动位置
function calculateMovePosition(
  intersectingNodeId: string,
  quadrant: number,
  findNodeAndParentFn: (
    targetId: string,
  ) => { node: OrgChartData; parent: OrgChartData | null; index: number } | null,
): MovePosition | null {
  // 找到目标节点和其父节点
  const result = findNodeAndParentFn(intersectingNodeId)
  if (!result) return null

  const { node: targetNode, parent: parentNode, index: nodeIndex } = result

  switch (quadrant) {
    case 1: // 右上 - 加在当前节点右边（同级）
      if (!parentNode) {
        return {
          targetLevel: 'parent',
          parentId: 'root',
          insertIndex: 1, // 根节点右边
        }
      }
      return {
        targetLevel: 'parent',
        parentId: parentNode.id,
        insertIndex: nodeIndex + 1,
      }

    case 2: // 左上 - 加在当前节点左边（同级）
      if (!parentNode) {
        return {
          targetLevel: 'parent',
          parentId: 'root',
          insertIndex: 0, // 根节点左边
        }
      }
      return {
        targetLevel: 'parent',
        parentId: parentNode.id,
        insertIndex: nodeIndex,
      }

    case 3: // 左下 - 加在子级最左边
      return {
        targetLevel: 'child',
        parentId: targetNode.id,
        insertIndex: 0,
      }

    case 4: // 右下 - 加在子级最右边
      const childCount = targetNode.children?.length || 0
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
  const { createGhostNode } = useNode()
  const { treeData, findNodeAndParent, moveNode, addNode, removeNode } = useOrgTreeData(initialData)
  let ghostNode: Node | null = null
  let isDragging = false
  let sourceNode: Node | null = null
  let mouseDownPosition: { x: number; y: number } | null = null
  const DRAG_THRESHOLD = 5 // 拖拽阈值，移动超过5px才认为是拖拽

  // 节流优化：减少昂贵的相交检测计算
  let lastIntersectionCheck = 0
  const INTERSECTION_CHECK_INTERVAL = 16 // ~60fps

  // 公共清理逻辑
  const handleMouseUpCleanup = (isBlankArea = false) => {
    graph.enablePanning()

    if (isDragging && sourceNode) {
      // 检查是否有pending的移动操作
      const allData = sourceNode.getData()
      const pendingMove = allData?.pendingMove as MovePosition | undefined

      if (pendingMove) {
        // 执行移动操作
        const success = moveNode(sourceNode.id, pendingMove)

        if (success) {
          console.log(`✅ 节点移动成功${isBlankArea ? '（空白区域释放）' : ''}`)
          // console.log('📄 修改后的tree数据:', JSON.stringify(treeData.value, null, 2))
        } else {
          console.log('❌ 节点移动失败')
        }

        // 清理pending数据
        const currentData = sourceNode.getData()
        if (currentData) {
          delete currentData.pendingMove
          sourceNode.setData(currentData)
        }
      }

      // 清理幽灵节点
      if (ghostNode) {
        ghostNode.remove()
        ghostNode = null
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
        console.log('开始拖拽')
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
                maxAreaNode.quadrant,
                findNodeAndParent,
              )

              if (movePosition) {
                // 暂存移动信息，在mouseup时执行
                sourceNode.setData({ pendingMove: movePosition })
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
        handleMouseUpCleanup(false)
      } else {
        // 如果不是拖拽（简单点击），手动触发点击事件
        // console.log('节点被点击:', sourceNode)
        // 添加选中效果
        // graph.batchUpdate(() => {
        //   const nodes = graph.getNodes()
        //   nodes.forEach((node) => {
        //     if (node.shape === 'org-node') {
        //       node.setAttrs({ '.card': { selected: false } })
        //     }
        //   })
        // })
        // sourceNode?.setAttrs({ '.card': { selected: true } })

        // 清理状态
        graph.enablePanning()
        sourceNode = null
        mouseDownPosition = null
      }
    }
  })

  // 添加全局mouseup事件，确保在画布空白处释放也能清理
  graph.on('blank:mouseup', () => {
    handleMouseUpCleanup(true)

    // 清除选中效果
    // graph.batchUpdate(() => {
    //   const nodes = graph.getNodes()
    //   nodes.forEach((node) => {
    //     if (node.shape === 'org-node') {
    //       node.setAttrs({ '.card': { selected: false } })
    //     }
    //   })
    // })
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
      console.log('📄 更新后的tree数据:', JSON.stringify(treeData.value, null, 2))
    } else {
      console.log('❌ 新节点添加失败')
    }
  })

  graph.bindKey('delete', (e: KeyboardEvent) => {
    e.preventDefault()

    const selectedCells = graph.getSelectedCells()
    if (selectedCells.length > 0) {
      removeNode(selectedCells[0].id)
    }
    // graphInstance.batchUpdate(() => {
    //   const selectedCells = graphInstance.getSelectedCells()
    //   if (selectedCells.length > 0) {
    //     selectedCells.map((cell: Cell) => {
    //       if (cell.isNode()) {
    //         const successors = graphInstance.getSuccessors(cell)
    //         successors.map((node) => graphInstance.removeNode(node as Node))
    //         if (!graphInstance.isRootNode(cell)) {
    //           graphInstance.removeNode(cell)
    //         }
    //       }
    //     })
    //   }
    // })
    return false
  })

  // 返回响应式tree数据，供外部监听
  return {
    treeData,
  }
}
