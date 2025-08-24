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
import { nextTick, onMounted, ref } from 'vue'
import { useOrgChart } from './hooks/useOrgChart'
import { setupEventHandlers } from './hooks/useEvents'

const graphRef = ref<HTMLDivElement | null>(null)

const props = withDefaults(defineProps<OrgChartProps>(), {
  config: () => ({
    width: 800,
    height: 600,
  }),
})

const { initialize, renderData } = useOrgChart(props.config)

const initChart = async () => {
  if (!graphRef.value) {
    throw new Error('graphRef is null')
  }
  // 初始化图
  const graphInstance = await initialize(graphRef.value)
  // 导入初始数据
  if (props.data) {
    renderData(props.data)
    graphInstance.centerContent()
  }
  // 设置事件处理
  setupEventHandlers(graphInstance)
}

onMounted(async () => {
  await nextTick()
  await initChart()
})
</script>
