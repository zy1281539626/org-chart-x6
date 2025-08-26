<template>
  <div>
    <!-- 画布 -->
    <div ref="graphRef" class="org-chart-graph"></div>
    <!-- 工具栏 -->
    <div class="org-chart-toolbar"></div>
  </div>
</template>

<script lang="ts" setup>
import type { Graph, Rectangle } from '@antv/x6'
import type { OrgChartProps } from './types'
import './styles/index.css'
import { nextTick, onMounted, ref, watch, type Ref } from 'vue'
import { useOrgChart } from './hooks/useOrgChart'
import { setupEventHandlers } from './hooks/useEvents'
import type { OrgChartData } from './types'

const graphRef = ref<HTMLDivElement | null>(null)

const props = withDefaults(defineProps<OrgChartProps>(), {
  config: () => ({
    width: 800,
    height: 600,
  }),
})

const { initialize, renderData, setTreeDataSyncCallback } = useOrgChart(props.config)
let graphInstance: Graph | null = null
let eventTreeData: Ref<OrgChartData | null> | null = null
let updateEventTreeData: ((newData: OrgChartData) => void) | null = null

const initChart = async () => {
  if (!graphRef.value) {
    throw new Error('graphRef is null')
  }
  // 初始化图
  graphInstance = initialize(graphRef.value)
  // 导入初始数据
  if (props.data) {
    renderData(props.data, true)
    graphInstance.centerContent()
  }
  // 设置事件处理
  if (props.data) {
    const eventHandler = setupEventHandlers(graphInstance, props.data)
    eventTreeData = eventHandler.treeData
    updateEventTreeData = eventHandler.updateTreeData

    // 设置数据同步回调 - 当undo/redo时更新eventTreeData
    setTreeDataSyncCallback((newData: OrgChartData) => {
      console.log('🔄 [OrgChart] 收到数据同步回调:')
      console.log(JSON.stringify(newData, null, 2))
      if (updateEventTreeData) {
        console.log('🔄 [OrgChart] 正在更新事件树数据...')
        updateEventTreeData(newData)
      }
    })

    // 监听数据变化，重新渲染
    watch(
      eventTreeData,
      (newData, oldData) => {
        console.log('👀 [OrgChart] 事件树数据变化:')
        console.log('  旧数据:', JSON.stringify(oldData, null, 2))
        console.log('  新数据:', JSON.stringify(newData, null, 2))
        if (newData && graphInstance) {
          console.log('🔄 [OrgChart] 开始重新渲染图形...')
          renderData(newData)
          console.log('✅ [OrgChart] 图形重新渲染完成')
        }
      },
      { deep: true },
    )
  }
}

// 导出图片功能
const exportChart = () => {
  const { width, height } = graphInstance?.getContentArea() as Rectangle
  graphInstance?.exportPNG('org-chart.png', {
    width: width * 3, // 3倍图
    height: height * 3, // 3倍图
    backgroundColor: '#ffffff',
    padding: 40,
    quality: 1,
  })
}
// 撤销
const onUndo = () => {
  console.log('🔙 [OrgChart] 用户点击撤销按钮')
  if (graphInstance) {
    console.log('📊 [OrgChart] 撤销前历史状态:', {
      canUndo: graphInstance.canUndo(),
      canRedo: graphInstance.canRedo(),
      undoStackSize: graphInstance.getUndoStackSize(),
      redoStackSize: graphInstance.getRedoStackSize(),
      historyStackSize: graphInstance.getHistoryStackSize(),
      currentNodesCount: graphInstance.getNodes().length,
      currentEdgesCount: graphInstance.getEdges().length
    })
    
    if (graphInstance.canUndo()) {
      console.log('✅ [OrgChart] 可以撤销，执行撤销操作')
      graphInstance.undo()
    } else {
      console.log('❌ [OrgChart] 无法撤销')
    }
  }
}
// 重做
const onRedo = () => {
  console.log('🔜 [OrgChart] 用户点击重做按钮')
  if (graphInstance) {
    console.log('📊 [OrgChart] 重做前历史状态:', {
      canUndo: graphInstance.canUndo(),
      canRedo: graphInstance.canRedo(),
      undoStackSize: graphInstance.getUndoStackSize(),
      redoStackSize: graphInstance.getRedoStackSize(),
      historyStackSize: graphInstance.getHistoryStackSize(),
      currentNodesCount: graphInstance.getNodes().length,
      currentEdgesCount: graphInstance.getEdges().length
    })
    
    if (graphInstance.canRedo()) {
      console.log('✅ [OrgChart] 可以重做，执行重做操作')
      graphInstance.redo()
    } else {
      console.log('❌ [OrgChart] 无法重做')
    }
  }
}

onMounted(async () => {
  await nextTick()
  await initChart()
})

defineExpose({
  exportChart,
  onUndo,
  onRedo,
})
</script>
