<template>
  <div>
    <button @click="onExport">导出图片</button>
    <button @click="onUndo">撤销undo</button>
    <button @click="onRedo">重做redo</button>
    <button @click="getData">获取data</button>
    <org-chart
      style="height: 900px"
      ref="orgChartRef"
      v-model:data="data"
      :config="{ width: 1000, height: 800 }"
    />
  </div>
</template>

<script lang="ts" setup>
import OrgChart from '@/components/org-chart/OrgChart.vue'
import { ref } from 'vue'

const data = ref({
  id: '1',
  name: '根节点',
  children: [
    {
      id: '1-1',
      name: '子节点1',
      edgeLabel: '管理关系',
      children: [
        {
          id: '1-1-1',
          name: '子节点1-1',
          edgeLabel: '直接下属',
          children: [
            {
              id: '1-1-1-1',
              name: '子节点1-1-1',
              edgeLabel: '团队成员',
            },
          ],
        },
        {
          id: '1-1-2',
          name: '子节点1-2',
          edgeLabel: '协作关系',
        },
      ],
    },
    {
      id: '1-2',
      name: '子节点2',
      edgeLabel: '部门关系',
      children: [
        {
          id: '1-2-1',
          name: '子节点2-1',
          edgeLabel: '项目关系',
        },
      ],
    },
  ],
})

const orgChartRef = ref()

const onExport = () => {
  orgChartRef.value.exportChart()
}
const onUndo = () => {
  orgChartRef.value.onUndo()
}
const onRedo = () => {
  orgChartRef.value.onRedo()
}

const getData = () => {
  console.log(data.value)
}
</script>
