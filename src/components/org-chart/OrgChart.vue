<template>
  <div>
    <!-- 画布 -->
    <div ref="graphRef" class="org-chart-graph"></div>
    <!-- 工具栏 -->
    <div class="org-chart-toolbar"></div>
  </div>
</template>

<script lang="ts" setup>
import type { OrgChartProps } from './types'
import './styles/index.css'
import { nextTick, onMounted, ref, watch, type Ref } from 'vue'
import { useOrgChart } from './hooks/useOrgChart'
import { setupEventHandlers } from './hooks/useEvents'
import type { Graph } from '@antv/x6'
import type { OrgChartData } from './types'

const graphRef = ref<HTMLDivElement | null>(null)

const props = withDefaults(defineProps<OrgChartProps>(), {
  config: () => ({
    width: 800,
    height: 600,
  }),
})

const { initialize, renderData } = useOrgChart(props.config)
let graphInstance: Graph | null = null
let eventTreeData: Ref<OrgChartData | null> | null = null

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

    // 监听数据变化，重新渲染
    watch(
      eventTreeData,
      (newData) => {
        if (newData && graphInstance) {
          renderData(newData)
          // graphInstance.centerContent()
        }
      },
      { deep: true },
    )
  }
}

onMounted(async () => {
  await nextTick()
  await initChart()
})
</script>
