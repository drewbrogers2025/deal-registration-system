'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'

interface AutoSaveOptions {
  key: string
  delay?: number
  onSave?: (data: any) => Promise<void> | void
  onError?: (error: Error) => void
  enabled?: boolean
}

interface AutoSaveStatus {
  isSaving: boolean
  lastSaved: Date | null
  error: Error | null
}

export function useAutoSave<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  options: AutoSaveOptions
) {
  const {
    key,
    delay = 2000,
    onSave,
    onError,
    enabled = true,
  } = options

  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastDataRef = useRef<string>('')
  const statusRef = useRef<AutoSaveStatus>({
    isSaving: false,
    lastSaved: null,
    error: null,
  })

  const { watch, getValues } = form

  // Load saved data from localStorage on mount
  useEffect(() => {
    if (!enabled) return

    try {
      const savedData = localStorage.getItem(`autosave-${key}`)
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        
        // Only restore if the form is empty or has default values
        const currentValues = getValues()
        const isEmpty = Object.values(currentValues).every(value => 
          value === '' || value === null || value === undefined || 
          (Array.isArray(value) && value.length === 0)
        )
        
        if (isEmpty) {
          Object.keys(parsedData).forEach(fieldName => {
            form.setValue(fieldName as any, parsedData[fieldName])
          })
        }
      }
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error)
    }
  }, [key, enabled, form, getValues])

  // Save data to localStorage
  const saveToLocalStorage = useCallback((data: T) => {
    try {
      localStorage.setItem(`autosave-${key}`, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  }, [key])

  // Clear saved data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(`autosave-${key}`)
      lastDataRef.current = ''
    } catch (error) {
      console.warn('Failed to clear saved data:', error)
    }
  }, [key])

  // Auto-save function
  const performAutoSave = useCallback(async (data: T) => {
    if (!enabled) return

    statusRef.current.isSaving = true
    statusRef.current.error = null

    try {
      // Save to localStorage first
      saveToLocalStorage(data)

      // Call custom save function if provided
      if (onSave) {
        await onSave(data)
      }

      statusRef.current.lastSaved = new Date()
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Auto-save failed')
      statusRef.current.error = err
      
      if (onError) {
        onError(err)
      }
    } finally {
      statusRef.current.isSaving = false
    }
  }, [enabled, saveToLocalStorage, onSave, onError])

  // Watch for form changes
  useEffect(() => {
    if (!enabled) return

    const subscription = watch((data) => {
      const currentData = JSON.stringify(data)
      
      // Only save if data has actually changed
      if (currentData !== lastDataRef.current) {
        lastDataRef.current = currentData

        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Set new timeout for auto-save
        timeoutRef.current = setTimeout(() => {
          performAutoSave(data as T)
        }, delay)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [watch, enabled, delay, performAutoSave])

  // Manual save function
  const saveNow = useCallback(async () => {
    const data = getValues()
    await performAutoSave(data)
  }, [getValues, performAutoSave])

  // Get current status
  const getStatus = useCallback((): AutoSaveStatus => {
    return { ...statusRef.current }
  }, [])

  return {
    saveNow,
    clearSavedData,
    getStatus,
    isSaving: statusRef.current.isSaving,
    lastSaved: statusRef.current.lastSaved,
    error: statusRef.current.error,
  }
}

// Hook for managing draft state
export function useDraftManager<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  options: {
    key: string
    onSaveDraft?: (data: T) => Promise<void>
    onLoadDraft?: () => Promise<T | null>
    onDeleteDraft?: () => Promise<void>
  }
) {
  const { key, onSaveDraft, onLoadDraft, onDeleteDraft } = options

  const saveDraft = useCallback(async () => {
    const data = form.getValues()
    
    try {
      if (onSaveDraft) {
        await onSaveDraft(data)
      } else {
        localStorage.setItem(`draft-${key}`, JSON.stringify(data))
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
      throw error
    }
  }, [form, key, onSaveDraft])

  const loadDraft = useCallback(async () => {
    try {
      let draftData: T | null = null

      if (onLoadDraft) {
        draftData = await onLoadDraft()
      } else {
        const saved = localStorage.getItem(`draft-${key}`)
        if (saved) {
          draftData = JSON.parse(saved)
        }
      }

      if (draftData) {
        Object.keys(draftData).forEach(fieldName => {
          form.setValue(fieldName as any, draftData![fieldName])
        })
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to load draft:', error)
      return false
    }
  }, [form, key, onLoadDraft])

  const deleteDraft = useCallback(async () => {
    try {
      if (onDeleteDraft) {
        await onDeleteDraft()
      } else {
        localStorage.removeItem(`draft-${key}`)
      }
    } catch (error) {
      console.error('Failed to delete draft:', error)
      throw error
    }
  }, [key, onDeleteDraft])

  const hasDraft = useCallback(async () => {
    try {
      if (onLoadDraft) {
        const draft = await onLoadDraft()
        return draft !== null
      } else {
        return localStorage.getItem(`draft-${key}`) !== null
      }
    } catch (error) {
      console.error('Failed to check for draft:', error)
      return false
    }
  }, [key, onLoadDraft])

  return {
    saveDraft,
    loadDraft,
    deleteDraft,
    hasDraft,
  }
}
