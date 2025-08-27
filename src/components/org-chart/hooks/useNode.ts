import { Cell, Edge, Graph, Node } from '@antv/x6'
import type { HierarchyResult } from '../types'
import addIconSvg from '../assets/add.svg?raw'

const addIcon = 'data:image/svg+xml;base64,' + btoa(addIconSvg)

export function useNode() {
  // 注册节点
  const registerNode = (width: number, height: number) => {
    Graph.registerNode(
      'org-node',
      {
        width,
        height,
        markup: [
          {
            tagName: 'rect',
            attrs: {
              class: 'card',
            },
          },
          {
            tagName: 'image',
            attrs: {
              class: 'addIcon',
            },
          },
          {
            tagName: 'text',
            attrs: {
              class: 'name',
            },
          },
        ],
        attrs: {
          '.card': {
            rx: 0,
            ry: 0,
            refWidth: '100%',
            refHeight: '100%',
            class: 'card',
          },
          '.addIcon': {
            xlinkHref: addIcon,
            x: width / 2 - 12,
            y: height,
            width: 24,
            height: 24,
            event: 'node:add',
          },
          '.name': {
            refX: '50%',
            refY: '50%',
            fontSize: 16,
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
          },
        },
        tools: [
          {
            name: 'node-editor',
            args: {
              attrs: {
                fontSize: 16,
                backgroundColor: '#fff',
              },
              // history 生效
              getText: ({ cell }: { cell: Cell }) => {
                return cell.getAttrByPath('.name/text')
              },
              setText: ({ cell, value }: { cell: Cell; value: string }) => {
                if (value) {
                  cell.setAttrs({ '.name': { text: value } })
                }
              },
            },
          },
        ],
      },
      true,
    )

    Graph.registerNode(
      'org-ghost-node',
      {
        width,
        height,
        markup: [
          {
            tagName: 'rect',
            attrs: {
              class: 'ghost-rect',
            },
          },
          {
            tagName: 'text',
            attrs: {
              class: 'ghost-text',
            },
          },
        ],
        attrs: {
          '.ghost-rect': {
            rx: 4,
            ry: 4,
            refWidth: '100%',
            refHeight: '100%',
            fill: '#E6F7FF',
            stroke: '#1890FF',
            strokeWidth: 2,
            strokeDasharray: '8,4',
            fillOpacity: 0.5,
            strokeOpacity: 0.8,
          },
          '.ghost-text': {
            refX: '50%',
            refY: '50%',
            fill: '#1890FF',
            fontSize: 14,
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
            text: '拖拽中...',
            fontWeight: 'bold',
          },
        },
      },
      true,
    )
  }

  // 创建节点元数据
  const createNodeMeta = (data: HierarchyResult, isRoot: boolean = false) => {
    const attrs: {
      '.name': { text: string; fill: string }
      '.card'?: { class: string }
    } = {
      '.name': {
        text: data.data.name || `A节点 ${data.id}`,
        fill: isRoot ? '#ffffff' : '#000000',
      },
    }

    // 根节点，添加root-node class
    if (isRoot) {
      attrs['.card'] = {
        class: 'card root-node',
      }
    }

    return {
      id: `${data.id}`,
      x: data.x,
      y: data.y,
      shape: 'org-node',
      attrs,
    }
  }

  // 创建幽灵节点
  const createGhostNode = (graph: Graph, sourceNode: Node) => {
    const bbox = sourceNode.getBBox()
    const nodeAttrs = sourceNode.getAttrs()

    return graph.addNode({
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

  // 创建或更新预览节点
  const createPreviewNode = (
    graph: Graph,
    existingPreviewNode: Node | null,
    x: number,
    y: number,
  ): Node => {
    if (existingPreviewNode) {
      // 如果预览节点已存在，直接移动位置
      existingPreviewNode.setPosition(x, y)
      return existingPreviewNode
    } else {
      // 创建新的预览节点
      return graph.addNode({
        x,
        y,
        width: 100,
        height: 28,
        shape: 'rect',
        attrs: {
          body: {
            fill: '#ff9500',
            stroke: '#ff6600',
            strokeWidth: 2,
            opacity: 0.8,
          },
        },
        zIndex: 999,
      })
    }
  }

  // 创建或更新预览边
  const createPreviewEdge = (
    graph: Graph,
    existingPreviewEdge: Edge | null,
    previewNode: Node,
    parentNode: Node,
  ) => {
    // 如果已有预览边，先移除
    if (existingPreviewEdge) {
      existingPreviewEdge.remove()
    }

    // 创建新的预览边
    return graph.addEdge({
      source: { cell: parentNode.id },
      target: { cell: previewNode.id },
      shape: 'org-edge',
      router: {
        name: 'manhattan',
        args: {
          excludeShapes: ['org-node', 'rect'],
          excludeNodes: [previewNode],
          startDirections: ['bottom'],
          endDirections: ['top'],
        },
      },
      attrs: {
        line: {
          stroke: '#ff9500',
          strokeWidth: 2,
        },
      },
      zIndex: 998,
    })
  }

  return {
    registerNode,
    createNodeMeta,
    createGhostNode,
    createPreviewNode,
    createPreviewEdge,
  }
}
