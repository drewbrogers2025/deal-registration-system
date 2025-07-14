'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Check,
  X,
  MoreHorizontal,
  Download,
  Upload,
  Trash2,
  Edit,
  Archive,
  CheckSquare,
  Square,
  Minus,
} from 'lucide-react'

export interface BulkAction {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary'
  requiresConfirmation?: boolean
  confirmationMessage?: string
  disabled?: boolean
  permission?: string
}

export interface BulkOperationsProps<T = any> {
  selectedItems: T[]
  totalItems: number
  onSelectAll: () => void
  onSelectNone: () => void
  onSelectInvert: () => void
  actions: BulkAction[]
  onAction: (actionId: string, items: T[]) => Promise<void> | void
  className?: string
  showItemCount?: boolean
  maxDisplayItems?: number
}

export function BulkOperations<T = any>({
  selectedItems,
  totalItems,
  onSelectAll,
  onSelectNone,
  onSelectInvert,
  actions,
  onAction,
  className,
  showItemCount = true,
  maxDisplayItems = 100,
}: BulkOperationsProps<T>) {
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = React.useState<string | null>(null)

  const selectedCount = selectedItems.length
  const isAllSelected = selectedCount === totalItems && totalItems > 0
  const isPartiallySelected = selectedCount > 0 && selectedCount < totalItems
  const isNoneSelected = selectedCount === 0

  const handleAction = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId)
    if (!action) return

    if (action.requiresConfirmation) {
      setShowConfirmation(actionId)
      return
    }

    await executeAction(actionId)
  }

  const executeAction = async (actionId: string) => {
    setIsProcessing(actionId)
    setShowConfirmation(null)

    try {
      await onAction(actionId, selectedItems)
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setIsProcessing(null)
    }
  }

  const getSelectionIcon = () => {
    if (isAllSelected) {
      return <CheckSquare className="h-4 w-4" />
    } else if (isPartiallySelected) {
      return <Minus className="h-4 w-4" />
    } else {
      return <Square className="h-4 w-4" />
    }
  }

  const getSelectionAction = () => {
    if (isAllSelected) {
      return onSelectNone
    } else {
      return onSelectAll
    }
  }

  if (isNoneSelected && !showItemCount) {
    return null
  }

  return (
    <>
      <Card className={cn("border-blue-200 bg-blue-50", className)}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {/* Selection Controls */}
            <div className="flex items-center space-x-4">
              <Tooltip content={isAllSelected ? "Deselect all" : "Select all"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={getSelectionAction()}
                  className="text-blue-700 hover:text-blue-800"
                >
                  {getSelectionIcon()}
                </Button>
              </Tooltip>

              <div className="flex items-center space-x-2">
                {showItemCount && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedCount} of {totalItems} selected
                  </Badge>
                )}

                {selectedCount > 0 && (
                  <div className="flex items-center space-x-1 text-sm text-blue-700">
                    <button
                      onClick={onSelectNone}
                      className="hover:underline"
                    >
                      Clear
                    </button>
                    <span>•</span>
                    <button
                      onClick={onSelectInvert}
                      className="hover:underline"
                    >
                      Invert
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedCount > 0 && (
              <div className="flex items-center space-x-2">
                {actions
                  .filter(action => !action.disabled)
                  .slice(0, 3)
                  .map((action) => {
                    const Icon = action.icon
                    const isLoading = isProcessing === action.id

                    return (
                      <Tooltip key={action.id} content={action.label}>
                        <Button
                          variant={action.variant || 'outline'}
                          size="sm"
                          onClick={() => handleAction(action.id)}
                          disabled={isLoading || !!isProcessing}
                          className={cn(
                            action.variant === 'destructive' && "border-red-300 text-red-700 hover:bg-red-50"
                          )}
                        >
                          {Icon && <Icon className="h-4 w-4 mr-1" />}
                          {isLoading ? 'Processing...' : action.label}
                        </Button>
                      </Tooltip>
                    )
                  })}

                {actions.length > 3 && (
                  <div className="relative group">
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>

                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <div className="py-1">
                        {actions.slice(3).map((action) => {
                          const Icon = action.icon
                          const isLoading = isProcessing === action.id

                          return (
                            <button
                              key={action.id}
                              onClick={() => handleAction(action.id)}
                              disabled={action.disabled || isLoading || !!isProcessing}
                              className={cn(
                                "flex items-center w-full px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed",
                                action.variant === 'destructive' && "text-red-600 hover:bg-red-50"
                              )}
                            >
                              {Icon && <Icon className="h-4 w-4 mr-2" />}
                              {isLoading ? 'Processing...' : action.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Items Preview */}
          {selectedCount > 0 && selectedCount <= maxDisplayItems && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-600 mb-2">Selected items:</p>
              <div className="flex flex-wrap gap-1">
                {selectedItems.slice(0, 10).map((item: any, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {item.name || item.title || item.id || `Item ${index + 1}`}
                  </Badge>
                ))}
                {selectedCount > 10 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedCount - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Confirm Action</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                {actions.find(a => a.id === showConfirmation)?.confirmationMessage ||
                  `Are you sure you want to perform this action on ${selectedCount} item(s)?`}
              </p>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => executeAction(showConfirmation)}
                  disabled={!!isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// Predefined bulk actions
export const commonBulkActions: BulkAction[] = [
  {
    id: 'export',
    label: 'Export',
    icon: Download,
    variant: 'outline',
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: Edit,
    variant: 'outline',
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    variant: 'outline',
    requiresConfirmation: true,
    confirmationMessage: 'Are you sure you want to archive the selected items?',
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmationMessage: 'This action cannot be undone. Are you sure you want to delete the selected items?',
  },
]
