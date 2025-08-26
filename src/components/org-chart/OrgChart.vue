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
      if (updateEventTreeData) {
        updateEventTreeData(newData)
      }
    })

    // 监听数据变化，重新渲染
    watch(
      eventTreeData,
      (newData) => {
        if (newData && graphInstance) {
          // 使用 batchUpdate 确保所有图形操作被合并为一个历史记录
          graphInstance.batchUpdate(() => {
            renderData(newData, false) // 正常渲染，允许产生历史记录
          })
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
  if (graphInstance?.canUndo()) {
    graphInstance.undo()
  }
}
// 重做
const onRedo = () => {
  if (graphInstance?.canRedo()) {
    graphInstance.redo()
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
