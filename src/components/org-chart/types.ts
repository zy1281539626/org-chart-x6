// 节点数据
export interface OrgNodeData {
  id: string
  name: string
  parentId?: string
  [key: string]: unknown
}

// 边数据
export interface OrgEdgeData {
  id: string
  source: string
  target: string
  [key: string]: unknown
}

// 组织架构图数据
export interface OrgChartData {
  id: string
  name?: string
  children?: OrgChartData[]
  // nodes: OrgNodeData[]
  // edges: OrgEdgeData[]
}

// 组织架构图配置项
export interface OrgChartConfig {
  // 画布宽度
  width?: number
  // 画布高度
  height?: number
  // 画布背景色
  background?: string
  // 节点宽度
  nodeWidth?: number
  // 节点高度
  nodeHeight?: number
  // 节点水平间距
  nodeHGap?: number
  // 节点垂直间距
  nodeVGap?: number
}

// 组件属性
export interface OrgChartProps {
  // 数据
  data?: OrgChartData
  // 配置项
  config?: Partial<OrgChartConfig>
}

// 树型布局结果
export interface HierarchyResult {
  id: number
  name?: string
  x: number
  y: number
  data: OrgChartData
  children: HierarchyResult[]
}
