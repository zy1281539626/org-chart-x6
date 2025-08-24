<template>
  <div>
    <org-chart :data="data" :config="{ width: 1000, height: 800 }" />
  </div>
</template>

<script lang="ts" setup>
import OrgChart from '@/components/org-chart/OrgChart.vue'

const data = {
  id: '1',
  name: '根节点',
  children: [
    {
      id: '1-1',
      name: '子节点1',
      children: [
        {
          id: '1-1-1',
          name: '子节点1-1',
          children: [
            {
              id: '1-1-1-1',
              name: '子节点1-1-1',
            },
          ],
        },
        {
          id: '1-1-2',
          name: '子节点1-2',
        },
      ],
    },
    {
      id: '1-2',
      name: '子节点2',
      children: [
        {
          id: '1-2-1',
          name: '子节点2-1',
        },
      ],
    },
  ],
}
</script>
