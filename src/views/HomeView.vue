<template>
  <div>
    <button @click="onExport">导出图片</button>
    <button @click="onUndo">撤销undo</button>
    <button @click="onRedo">重做redo</button>
    <org-chart ref="orgChartRef" :data="data" :config="{ width: 1000, height: 800 }" />
  </div>
</template>

<script lang="ts" setup>
import OrgChart from '@/components/org-chart/OrgChart.vue'
import { ref } from 'vue'

// const data = {
//   id: '1',
//   name: '根节点',
//   children: [
//     {
//       id: '1-1',
//       name: '子节点1',
//       children: [
//         {
//           id: '1-1-1',
//           name: '子节点1-1',
//           children: [
//             {
//               id: '1-1-1-1',
//               name: '子节点1-1-1',
//             },
//           ],
//         },
//         {
//           id: '1-1-2',
//           name: '子节点1-2',
//         },
//       ],
//     },
//     {
//       id: '1-2',
//       name: '子节点2',
//       children: [
//         {
//           id: '1-2-1',
//           name: '子节点2-1',
//         },
//       ],
//     },
//   ],
// }
const data = ref()

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
</script>
