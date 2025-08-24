import type { Graph, Node } from '@antv/x6'
// import { useNode } from './useNode'

export function setupEventHandlers(graph: Graph) {
  // const { createNodeMeta } = useNode()
  let ghostNode: Node | null = null
  let isDragging = false
  let sourceNode: Node | null = null

  // 监听节点添加事件
  graph.on('node:add', ({ e, node }: { e: Event; node: Node }) => {
    e.stopPropagation()
    console.log('当前节点', node)
  })

  graph.on('cell:mousedown', ({ e, cell }) => {
    e.stopPropagation()
    if (cell.isNode()) {
      graph.disablePanning()
      isDragging = true
      sourceNode = cell as Node
    }
  })

  graph.on('cell:mousemove', ({ e, cell }) => {
    e.stopPropagation()
    if (cell.isNode() && isDragging && sourceNode) {
      // 如果还没有创建幽灵节点，创建一个
      if (!ghostNode) {
        const bbox = sourceNode.getBBox()
        const nodeAttrs = sourceNode.getAttrs()

        // 创建幽灵节点
        ghostNode = graph.addNode({
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
          shape: 'rect',
          attrs: {
            body: {
              fill: 'rgba(24, 144, 255, 0.1)',
              stroke: '#1890ff',
              strokeWidth: 2,
              strokeDasharray: '5 5',
            },
            label: {
              text: nodeAttrs['.name']?.text || '拖拽中...',
              fill: '#1890ff',
              fontSize: 14,
            },
          },
          zIndex: 1000,
        })
      }

      // 更新幽灵节点位置跟随鼠标
      if (ghostNode) {
        const { clientX, clientY } = e
        const localPoint = graph.clientToLocal(clientX, clientY)

        // 设置幽灵节点位置，居中于鼠标
        ghostNode.setPosition(
          localPoint.x - ghostNode.size().width / 2,
          localPoint.y - ghostNode.size().height / 2,
        )
      }
    }
  })

  graph.on('cell:mouseup', ({ e, cell }) => {
    e.stopPropagation()
    graph.enablePanning()

    if (cell.isNode() && isDragging) {
      // 清理幽灵节点
      if (ghostNode) {
        ghostNode.remove()
        ghostNode = null
      }
      isDragging = false
      sourceNode = null
      console.log('鼠标移出元素', e, cell)
    }
  })

  // 添加全局mouseup事件，确保在画布空白处释放也能清理
  graph.on('blank:mouseup', () => {
    graph.enablePanning()

    if (isDragging && ghostNode) {
      // 可选：在空白处释放时创建真实节点
      // const position = ghostNode.getPosition()
      // const nodeData = sourceNode?.getData()

      // 这里可以根据需要创建新节点
      // const newNode = graph.addNode({
      //   x: position.x,
      //   y: position.y,
      //   shape: 'org-node',
      //   attrs: {
      //     '.name': {
      //       text: nodeData?.name || '新节点',
      //     },
      //   },
      // })

      ghostNode.remove()
      ghostNode = null
    }

    isDragging = false
    sourceNode = null
  })
}
