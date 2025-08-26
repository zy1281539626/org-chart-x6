import { ref, type Ref } from 'vue'
import type { OrgChartData } from '../types'

// 移动位置信息
export interface MovePosition {
  targetLevel: 'parent' | 'child'
  parentId: string
  insertIndex: number
}

export function useOrgTreeData(initialData?: OrgChartData) {
  // 响应式数据
  const treeData: Ref<OrgChartData | null> = ref(
    initialData ? JSON.parse(JSON.stringify(initialData)) : null,
  )

  // 根据ID查找节点
  const findNodeById = (nodeId: string, data = treeData.value): OrgChartData | null => {
    if (!data) return null
    if (data.id === nodeId) return data

    if (data.children) {
      for (const child of data.children) {
        const found = findNodeById(nodeId, child)
        if (found) return found
      }
    }
    return null
  }

  // 查找节点和父节点
  const findNodeAndParent = (
    targetId: string,
    data = treeData.value,
    parent: OrgChartData | null = null,
  ): { node: OrgChartData; parent: OrgChartData | null; index: number } | null => {
    if (!data) return null
    if (data.id === targetId) {
      const index = parent?.children?.findIndex((child) => child.id === targetId) ?? 0
      return { node: data, parent, index }
    }

    if (data.children) {
      for (let i = 0; i < data.children.length; i++) {
        const result = findNodeAndParent(targetId, data.children[i], data)
        if (result) return result
      }
    }
    return null
  }

  // 移除节点（返回被移除的节点）
  const removeNode = (nodeId: string): OrgChartData | null => {
    if (!treeData.value || treeData.value.id === nodeId) {
      console.error('不能删除根节点')
      return null
    }

    const removeFromParent = (parent: OrgChartData): OrgChartData | null => {
      if (!parent.children) return null

      for (let i = 0; i < parent.children.length; i++) {
        if (parent.children[i].id === nodeId) {
          return parent.children.splice(i, 1)[0]
        }

        const removed = removeFromParent(parent.children[i])
        if (removed) return removed
      }
      return null
    }

    return removeFromParent(treeData.value)
  }

  // 添加节点到指定位置
  const addNode = (nodeData: OrgChartData, movePosition: MovePosition): boolean => {
    if (!treeData.value) return false

    const { targetLevel, parentId, insertIndex } = movePosition

    if (targetLevel === 'parent' && parentId === 'root') {
      console.error('暂不支持添加到根节点同级')
      return false
    }

    const parentNode = findNodeById(parentId)
    if (!parentNode) {
      console.error('父节点不存在:', parentId)
      return false
    }

    if (!parentNode.children) {
      parentNode.children = []
    }

    // 处理插入位置：-1 表示添加到最后
    const actualIndex = insertIndex === -1 ? parentNode.children.length : insertIndex

    parentNode.children.splice(actualIndex, 0, nodeData)
    return true
  }

  // 移动节点
  const moveNode = (sourceNodeId: string, movePosition: MovePosition): boolean => {
    const nodeData = removeNode(sourceNodeId)
    if (!nodeData) return false

    const success = addNode(nodeData, movePosition)
    if (!success) {
      console.error('移动节点失败，尝试恢复原位置')
      // TODO: 恢复到原位置的逻辑
    }
    return success
  }

  // 更新整个tree数据
  const updateTreeData = (newData: OrgChartData) => {
    console.log('📝 [useOrgTreeData] 更新树数据:', JSON.stringify(newData, null, 2))
    treeData.value = JSON.parse(JSON.stringify(newData))
    console.log('✅ [useOrgTreeData] 树数据更新完成')
  }

  return {
    treeData,
    findNodeById,
    findNodeAndParent,
    removeNode,
    addNode,
    moveNode,
    updateTreeData,
  }
}
