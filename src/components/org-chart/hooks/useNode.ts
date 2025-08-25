import { Graph, Node } from '@antv/x6'
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
              getText: '.name/text',
              setText: '.name/text',
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
        text: data.name || `节点 ${data.id}`,
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

  return {
    registerNode,
    createNodeMeta,
    createGhostNode,
  }
}
