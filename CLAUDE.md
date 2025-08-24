# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

这是一个基于 Vue 3 + TypeScript + Vite 构建的组织架构图组件项目，使用 AntV X6 图形引擎实现组织结构的可视化展示。

## 开发环境要求

- Node.js 版本: ^20.19.0 || >=22.12.0
- 包管理器: pnpm

## 常用命令

```sh
# 安装依赖
pnpm install

# 开发环境启动（热重载）
pnpm dev

# 类型检查
pnpm run type-check

# 代码检查和修复
pnpm lint

# 代码格式化
pnpm format

# 构建生产版本（包含类型检查）
pnpm build

# 仅构建（不进行类型检查）
pnpm run build-only

# 预览构建结果
pnpm preview
```

## 架构说明

### 核心组件架构

**主组件**: `src/components/org-chart/OrgChart.vue`
- 组织架构图的主入口组件，负责初始化 X6 图实例和渲染数据

**核心 Hook**: `src/components/org-chart/hooks/useOrgChart.ts`
- 管理 X6 图实例的生命周期
- 集成 @antv/hierarchy 进行树形布局计算
- 协调节点和边的注册与渲染

**节点管理**: `src/components/org-chart/hooks/useNode.ts`
- 定义和注册自定义节点类型 `org-node`
- 处理节点的样式、交互和数据映射

**边管理**: `src/components/org-chart/hooks/useEdge.ts`
- 定义和注册自定义边类型 `org-edge`
- 配置连接线的样式和路由规则

### 数据流

1. 组件接收 `OrgChartData` 类型的树形数据
2. `useOrgChart` hook 使用 @antv/hierarchy 进行布局计算
3. 将布局结果转换为 X6 节点和边的元数据
4. X6 实例渲染最终的组织架构图

### 类型定义

**核心数据类型** (`src/components/org-chart/types.ts`):
- `OrgChartData`: 树形组织数据结构
- `OrgChartConfig`: 组件配置选项（画布尺寸、节点间距等）
- `OrgChartProps`: Vue 组件属性接口
- `HierarchyResult`: 布局计算结果

### 配置系统

**默认配置** (`src/components/org-chart/config.ts`):
- 画布尺寸: 800x600
- 节点尺寸: 120x40
- 节点间距: 水平20px，垂直40px

**配置合并**: `src/components/org-chart/utils.ts` 提供深度合并配置的工具函数

## 开发注意事项

- 使用 ESLint + Prettier 进行代码规范检查
- TypeScript 严格模式启用，需要完整的类型定义
- X6 的节点和边需要先注册再使用
- 组件采用 Composition API + `<script setup>` 语法
- 样式文件位于 `src/components/org-chart/styles/index.css`