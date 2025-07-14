'use client'

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface UploadedFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
  url?: string
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSize?: number // in bytes
  acceptedTypes?: string[]
  className?: string
  disabled?: boolean
  multiple?: boolean
  showPreview?: boolean
}

export function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx'],
  className,
  disabled = false,
  multiple = true,
  showPreview = true,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([])

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading' as const,
    }))

    setUploadedFiles(prev => {
      const updated = [...prev, ...newFiles]
      onFilesChange(updated)
      return updated
    })

    // Simulate upload progress
    newFiles.forEach(uploadedFile => {
      simulateUpload(uploadedFile.id)
    })
  }, [onFilesChange])

  const simulateUpload = (fileId: string) => {
    const interval = setInterval(() => {
      setUploadedFiles(prev => {
        const updated = prev.map(file => {
          if (file.id === fileId) {
            const newProgress = Math.min(file.progress + Math.random() * 30, 100)
            
            if (newProgress >= 100) {
              clearInterval(interval)
              return {
                ...file,
                progress: 100,
                status: Math.random() > 0.1 ? 'completed' : 'error' as const,
                error: Math.random() > 0.1 ? undefined : 'Upload failed',
                url: Math.random() > 0.1 ? `https://example.com/files/${file.file.name}` : undefined,
              }
            }
            
            return { ...file, progress: newProgress }
          }
          return file
        })
        
        onFilesChange(updated)
        return updated
      })
    }, 200)
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(file => file.id !== fileId)
      onFilesChange(updated)
      return updated
    })
  }

  const retryUpload = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.map(file => 
        file.id === fileId 
          ? { ...file, progress: 0, status: 'uploading' as const, error: undefined }
          : file
      )
      onFilesChange(updated)
      return updated
    })
    
    simulateUpload(fileId)
  }

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop,
    maxFiles: maxFiles - uploadedFiles.length,
    maxSize,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    disabled,
    multiple,
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive && !isDragReject && "border-blue-500 bg-blue-50",
          isDragReject && "border-red-500 bg-red-50",
          disabled && "cursor-not-allowed opacity-50",
          !isDragActive && !isDragReject && "border-gray-300 hover:border-gray-400"
        )}
      >
        <input {...getInputProps()} />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        {isDragActive ? (
          <p className="text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              Drag & drop files here, or click to select files
            </p>
            <p className="text-sm text-gray-500">
              Max {maxFiles} files, up to {formatFileSize(maxSize)} each
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supported: {acceptedTypes.join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="space-y-2">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-sm text-red-600 bg-red-50 p-2 rounded">
              <strong>{file.name}</strong>: {errors.map(e => e.message).join(', ')}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {showPreview && uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          {uploadedFiles.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50"
            >
              <File className="h-8 w-8 text-gray-400 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadedFile.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadedFile.file.size)}
                </p>
                
                {uploadedFile.status === 'uploading' && (
                  <div className="mt-1">
                    <div className="bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(uploadedFile.progress)}% uploaded
                    </p>
                  </div>
                )}
                
                {uploadedFile.error && (
                  <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(uploadedFile.status)}
                
                {uploadedFile.status === 'error' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retryUpload(uploadedFile.id)}
                  >
                    Retry
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(uploadedFile.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
