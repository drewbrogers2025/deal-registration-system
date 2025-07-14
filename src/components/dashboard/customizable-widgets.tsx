'use client'

import * as React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  MoreVertical,
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  X,
  Plus,
  BarChart3,
  FileText,
  AlertTriangle,
  Users,
  PoundSterling,
  Clock,
  TrendingUp,
  Activity,
} from 'lucide-react'

export interface Widget {
  id: string
  type: string
  title: string
  size: 'small' | 'medium' | 'large'
  position: { x: number; y: number }
  visible: boolean
  config?: Record<string, any>
}

export interface WidgetType {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  defaultSize: 'small' | 'medium' | 'large'
  component: React.ComponentType<{ widget: Widget; data?: unknown }>
}

// Sample widget components
const MetricWidget: React.FC<{ widget: Widget; data?: unknown }> = ({ widget, data }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-2xl font-bold">{data?.value || '0'}</p>
      <p className="text-sm text-gray-600">{data?.label || widget.title}</p>
      {data?.change && (
        <p className={cn(
          "text-xs flex items-center",
          data.change > 0 ? "text-green-600" : "text-red-600"
        )}>
          <TrendingUp className="h-3 w-3 mr-1" />
          {data.change > 0 ? '+' : ''}{data.change}%
        </p>
      )}
    </div>
    <div className="text-gray-400">
      {data?.icon || <BarChart3 className="h-8 w-8" />}
    </div>
  </div>
)

const ChartWidget: React.FC<{ widget: Widget; data?: unknown }> = ({ widget }) => (
  <div className="space-y-4">
    <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
      <BarChart3 className="h-8 w-8 text-gray-400" />
      <span className="ml-2 text-gray-500">Chart Placeholder</span>
    </div>
  </div>
)

const ListWidget: React.FC<{ widget: Widget; data?: unknown }> = ({ widget, data }) => (
  <div className="space-y-2">
    {(data?.items || []).slice(0, 5).map((item: unknown, index: number) => (
      <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
        <div>
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-gray-500">{item.subtitle}</p>
        </div>
        <Badge variant="secondary">{item.status}</Badge>
      </div>
    ))}
  </div>
)

// Available widget types
export const widgetTypes: WidgetType[] = [
  {
    id: 'total-deals',
    name: 'Total Deals',
    description: 'Display total number of deals',
    icon: FileText,
    defaultSize: 'small',
    component: MetricWidget,
  },
  {
    id: 'pending-deals',
    name: 'Pending Deals',
    description: 'Show deals awaiting assignment',
    icon: Clock,
    defaultSize: 'small',
    component: MetricWidget,
  },
  {
    id: 'conflicts',
    name: 'Active Conflicts',
    description: 'Display unresolved conflicts',
    icon: AlertTriangle,
    defaultSize: 'small',
    component: MetricWidget,
  },
  {
    id: 'revenue',
    name: 'Total Revenue',
    description: 'Show total deal value',
    icon: PoundSterling,
    defaultSize: 'small',
    component: MetricWidget,
  },
  {
    id: 'deals-chart',
    name: 'Deals Chart',
    description: 'Visual representation of deal trends',
    icon: BarChart3,
    defaultSize: 'large',
    component: ChartWidget,
  },
  {
    id: 'recent-activity',
    name: 'Recent Activity',
    description: 'Latest system activities',
    icon: Activity,
    defaultSize: 'medium',
    component: ListWidget,
  },
  {
    id: 'top-resellers',
    name: 'Top Resellers',
    description: 'Best performing resellers',
    icon: Users,
    defaultSize: 'medium',
    component: ListWidget,
  },
]

interface SortableWidgetProps {
  widget: Widget
  data?: unknown
  onRemove: (id: string) => void
  onToggleVisibility: (id: string) => void
  onConfigure?: (id: string) => void
}

function SortableWidget({ widget, data, onRemove, onToggleVisibility, onConfigure }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const widgetType = widgetTypes.find(type => type.id === widget.type)
  const WidgetComponent = widgetType?.component || MetricWidget

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-2',
    large: 'col-span-3',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[widget.size],
        isDragging && 'opacity-50',
        !widget.visible && 'opacity-60'
      )}
    >
      <Card className={cn(!widget.visible && 'border-dashed')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 cursor-grab"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            
            <div className="relative group">
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="py-1">
                  <button
                    onClick={() => onToggleVisibility(widget.id)}
                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    {widget.visible ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Widget
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show Widget
                      </>
                    )}
                  </button>
                  
                  {onConfigure && (
                    <button
                      onClick={() => onConfigure(widget.id)}
                      className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </button>
                  )}
                  
                  <button
                    onClick={() => onRemove(widget.id)}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {widget.visible && (
          <CardContent>
            <WidgetComponent widget={widget} data={data} />
          </CardContent>
        )}
      </Card>
    </div>
  )
}

interface CustomizableWidgetsProps {
  widgets: Widget[]
  onWidgetsChange: (widgets: Widget[]) => void
  data?: Record<string, any>
  onAddWidget?: () => void
  className?: string
}

export function CustomizableWidgets({
  widgets,
  onWidgetsChange,
  data = {},
  onAddWidget,
  className,
}: CustomizableWidgetsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex(widget => widget.id === active.id)
      const newIndex = widgets.findIndex(widget => widget.id === over?.id)

      onWidgetsChange(arrayMove(widgets, oldIndex, newIndex))
    }
  }

  const handleRemoveWidget = (id: string) => {
    onWidgetsChange(widgets.filter(widget => widget.id !== id))
  }

  const handleToggleVisibility = (id: string) => {
    onWidgetsChange(
      widgets.map(widget =>
        widget.id === id ? { ...widget, visible: !widget.visible } : widget
      )
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {onAddWidget && (
        <div className="flex justify-end">
          <Button onClick={onAddWidget} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {widgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                data={data[widget.type]}
                onRemove={handleRemoveWidget}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
