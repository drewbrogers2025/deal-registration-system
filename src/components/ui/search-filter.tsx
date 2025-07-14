'use client'

import * as React from "react"
import { Search, Filter, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface FilterGroup {
  key: string
  label: string
  options: FilterOption[]
  type?: 'single' | 'multiple'
  searchable?: boolean
}

export interface ActiveFilter {
  group: string
  value: string
  label: string
}

interface SearchFilterProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filterGroups: FilterGroup[]
  activeFilters: ActiveFilter[]
  onFilterChange: (filters: ActiveFilter[]) => void
  placeholder?: string
  className?: string
  showFilterCount?: boolean
}

export function SearchFilter({
  searchValue,
  onSearchChange,
  filterGroups,
  activeFilters,
  onFilterChange,
  placeholder = "Search...",
  className,
  showFilterCount = true,
}: SearchFilterProps) {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false)
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(new Set())
  const [groupSearchValues, setGroupSearchValues] = React.useState<Record<string, string>>({})

  const toggleGroup = (groupKey: string) => {
    const newOpenGroups = new Set(openGroups)
    if (newOpenGroups.has(groupKey)) {
      newOpenGroups.delete(groupKey)
    } else {
      newOpenGroups.add(groupKey)
    }
    setOpenGroups(newOpenGroups)
  }

  const handleFilterToggle = (group: string, option: FilterOption) => {
    const filterGroup = filterGroups.find(g => g.key === group)
    if (!filterGroup) return

    const existingFilterIndex = activeFilters.findIndex(
      f => f.group === group && f.value === option.value
    )

    let newFilters = [...activeFilters]

    if (existingFilterIndex >= 0) {
      // Remove filter
      newFilters.splice(existingFilterIndex, 1)
    } else {
      // Add filter
      if (filterGroup.type === 'single') {
        // Remove other filters from the same group
        newFilters = newFilters.filter(f => f.group !== group)
      }
      
      newFilters.push({
        group,
        value: option.value,
        label: option.label,
      })
    }

    onFilterChange(newFilters)
  }

  const removeFilter = (filter: ActiveFilter) => {
    const newFilters = activeFilters.filter(
      f => !(f.group === filter.group && f.value === filter.value)
    )
    onFilterChange(newFilters)
  }

  const clearAllFilters = () => {
    onFilterChange([])
  }

  const getFilteredOptions = (group: FilterGroup) => {
    const searchValue = groupSearchValues[group.key] || ''
    if (!searchValue) return group.options

    return group.options.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    )
  }

  const isOptionActive = (group: string, value: string) => {
    return activeFilters.some(f => f.group === group && f.value === value)
  }

  const activeFilterCount = activeFilters.length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filter Toggle */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {showFilterCount && activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {activeFilters.map((filter, index) => (
            <Badge
              key={`${filter.group}-${filter.value}-${index}`}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {filter.label}
              <button
                onClick={() => removeFilter(filter)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="border rounded-lg bg-white shadow-sm">
          <div className="p-4 space-y-4">
            {filterGroups.map((group) => (
              <div key={group.key} className="space-y-2">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center justify-between w-full text-left font-medium text-gray-900 hover:text-gray-700"
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      openGroups.has(group.key) ? "rotate-180" : ""
                    )}
                  />
                </button>

                {openGroups.has(group.key) && (
                  <div className="space-y-2 pl-4">
                    {group.searchable && (
                      <Input
                        placeholder={`Search ${group.label.toLowerCase()}...`}
                        value={groupSearchValues[group.key] || ''}
                        onChange={(e) =>
                          setGroupSearchValues(prev => ({
                            ...prev,
                            [group.key]: e.target.value,
                          }))
                        }
                        className="text-sm"
                      />
                    )}

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {getFilteredOptions(group).map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        >
                          <input
                            type={group.type === 'single' ? 'radio' : 'checkbox'}
                            name={group.type === 'single' ? group.key : undefined}
                            checked={isOptionActive(group.key, option.value)}
                            onChange={() => handleFilterToggle(group.key, option)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 flex-1">
                            {option.label}
                          </span>
                          {option.count !== undefined && (
                            <span className="text-xs text-gray-500">
                              ({option.count})
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
