'use client'

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Download,
  Maximize2,
  RefreshCw,
} from 'lucide-react'

export interface ChartData {
  [key: string]: string | number
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area'
  title: string
  data: ChartData[]
  xAxisKey: string
  yAxisKey?: string
  dataKeys: string[]
  colors?: string[]
  showLegend?: boolean
  showGrid?: boolean
  height?: number
}

const defaultColors = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
]

interface InteractiveChartProps {
  config: ChartConfig
  className?: string
  onExport?: (format: 'png' | 'svg' | 'pdf') => void
  onRefresh?: () => void
  loading?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const ChartTypeIcon = ({ type }: { type: ChartConfig['type'] }) => {
  const icons = {
    bar: BarChart3,
    line: LineChartIcon,
    pie: PieChartIcon,
    area: AreaChartIcon,
  }
  
  const Icon = icons[type]
  return <Icon className="h-4 w-4" />
}

export function InteractiveChart({
  config,
  className,
  onExport,
  onRefresh,
  loading = false,
}: InteractiveChartProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const chartRef = React.useRef<HTMLDivElement>(null)

  const colors = config.colors || defaultColors
  const height = config.height || 300

  const renderChart = () => {
    const commonProps = {
      data: config.data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    }

    switch (config.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            {config.showLegend && <Legend />}
            {config.dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        )

      case 'line':
        return (
          <LineChart {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            {config.showLegend && <Legend />}
            {config.dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={config.xAxisKey} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            {config.showLegend && <Legend />}
            {config.dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="1"
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        )

      case 'pie':
        const pieData = config.data.map((item, index) => ({
          ...item,
          fill: colors[index % colors.length],
        }))

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={config.dataKeys[0]}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        )

      default:
        return null
    }
  }

  const handleExport = (format: 'png' | 'svg' | 'pdf') => {
    if (onExport) {
      onExport(format)
    } else {
      // Default export functionality
      console.log(`Exporting chart as ${format}`)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <Card className={cn("relative", className)} ref={chartRef}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <ChartTypeIcon type={config.type} />
          <CardTitle className="text-base font-medium">{config.title}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {config.type}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-1">
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          
          {onExport && (
            <div className="relative group">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
              
              <div className="absolute right-0 top-full mt-1 w-32 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleExport('png')}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    Export PNG
                  </button>
                  <button
                    onClick={() => handleExport('svg')}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    Export SVG
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading chart data...</p>
            </div>
          </div>
        ) : config.data.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center">
              <ChartTypeIcon type={config.type} />
              <p className="text-sm text-gray-500 mt-2">No data available</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// Predefined chart configurations for common use cases
export const chartConfigs = {
  dealsOverTime: {
    type: 'line' as const,
    title: 'Deals Over Time',
    xAxisKey: 'date',
    dataKeys: ['deals'],
    showGrid: true,
    showLegend: false,
  },
  dealsByStatus: {
    type: 'pie' as const,
    title: 'Deals by Status',
    xAxisKey: 'status',
    dataKeys: ['count'],
    showLegend: true,
  },
  revenueByMonth: {
    type: 'bar' as const,
    title: 'Revenue by Month',
    xAxisKey: 'month',
    dataKeys: ['revenue'],
    showGrid: true,
    showLegend: false,
  },
  conflictResolution: {
    type: 'area' as const,
    title: 'Conflict Resolution Trends',
    xAxisKey: 'date',
    dataKeys: ['resolved', 'pending'],
    showGrid: true,
    showLegend: true,
  },
}
