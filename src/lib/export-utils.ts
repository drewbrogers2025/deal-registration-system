import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { saveAs } from 'file-saver'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface ExportColumn {
  key: string
  title: string
  width?: number
  format?: (value: any) => string
}

export interface ExportOptions {
  filename: string
  title?: string
  subtitle?: string
  columns: ExportColumn[]
  data: Record<string, any>[]
  includeTimestamp?: boolean
}

// CSV Export
export function exportToCSV(options: ExportOptions) {
  const { filename, columns, data, includeTimestamp = true } = options

  // Create CSV headers
  const headers = columns.map(col => col.title).join(',')
  
  // Create CSV rows
  const rows = data.map(row => 
    columns.map(col => {
      let value = row[col.key]
      
      // Apply formatting if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value)
      }
      
      // Escape commas and quotes
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""')
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`
        }
      }
      
      return value || ''
    }).join(',')
  )

  // Combine headers and rows
  const csvContent = [headers, ...rows].join('\n')
  
  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
  
  const finalFilename = includeTimestamp 
    ? `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    : `${filename}.csv`
    
  saveAs(blob, finalFilename)
}

// Excel Export
export function exportToExcel(options: ExportOptions) {
  const { filename, title, columns, data, includeTimestamp = true } = options

  // Create workbook
  const wb = XLSX.utils.book_new()
  
  // Prepare data for Excel
  const excelData = data.map(row => {
    const excelRow: Record<string, any> = {}
    columns.forEach(col => {
      let value = row[col.key]
      
      // Apply formatting if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value)
      }
      
      excelRow[col.title] = value
    })
    return excelRow
  })

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  const colWidths = columns.map(col => ({
    wch: col.width || 15
  }))
  ws['!cols'] = colWidths

  // Add title if provided
  if (title) {
    XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' })
    XLSX.utils.sheet_add_aoa(ws, [['']], { origin: 'A2' }) // Empty row
    
    // Shift data down
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    range.s.r += 2
    ws['!ref'] = XLSX.utils.encode_range(range)
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Data')

  // Generate filename
  const finalFilename = includeTimestamp 
    ? `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
    : `${filename}.xlsx`

  // Save file
  XLSX.writeFile(wb, finalFilename)
}

// PDF Export
export function exportToPDF(options: ExportOptions) {
  const { filename, title, subtitle, columns, data, includeTimestamp = true } = options

  // Create PDF document
  const doc = new jsPDF()
  
  let yPosition = 20

  // Add title
  if (title) {
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text(title, 20, yPosition)
    yPosition += 10
  }

  // Add subtitle
  if (subtitle) {
    doc.setFontSize(12)
    doc.setFont(undefined, 'normal')
    doc.text(subtitle, 20, yPosition)
    yPosition += 10
  }

  // Add timestamp
  if (includeTimestamp) {
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPosition)
    yPosition += 15
  }

  // Prepare table data
  const tableColumns = columns.map(col => col.title)
  const tableRows = data.map(row => 
    columns.map(col => {
      let value = row[col.key]
      
      // Apply formatting if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value)
      }
      
      return value || ''
    })
  )

  // Add table
  doc.autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: yPosition,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: columns.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width }
      }
      return acc
    }, {} as Record<number, any>),
  })

  // Generate filename
  const finalFilename = includeTimestamp 
    ? `${filename}_${new Date().toISOString().split('T')[0]}.pdf`
    : `${filename}.pdf`

  // Save file
  doc.save(finalFilename)
}

// JSON Export
export function exportToJSON(options: ExportOptions) {
  const { filename, columns, data, includeTimestamp = true } = options

  // Prepare data
  const jsonData = data.map(row => {
    const jsonRow: Record<string, any> = {}
    columns.forEach(col => {
      let value = row[col.key]
      
      // Apply formatting if provided (but keep original type for JSON)
      jsonRow[col.key] = value
    })
    return jsonRow
  })

  // Create export object
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalRecords: jsonData.length,
    data: jsonData,
  }

  // Convert to JSON string
  const jsonString = JSON.stringify(exportData, null, 2)
  
  // Create blob and save
  const blob = new Blob([jsonString], { type: 'application/json' })
  
  const finalFilename = includeTimestamp 
    ? `${filename}_${new Date().toISOString().split('T')[0]}.json`
    : `${filename}.json`
    
  saveAs(blob, finalFilename)
}

// Generic export function that handles all formats
export function exportData(format: 'csv' | 'excel' | 'pdf' | 'json', options: ExportOptions) {
  switch (format) {
    case 'csv':
      return exportToCSV(options)
    case 'excel':
      return exportToExcel(options)
    case 'pdf':
      return exportToPDF(options)
    case 'json':
      return exportToJSON(options)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

// Utility functions for common formatting
export const formatters = {
  currency: (value: number) => 
    new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP' 
    }).format(value),
    
  date: (value: string | Date) => 
    new Date(value).toLocaleDateString('en-GB'),
    
  datetime: (value: string | Date) => 
    new Date(value).toLocaleString('en-GB'),
    
  number: (value: number) => 
    new Intl.NumberFormat('en-GB').format(value),
    
  percentage: (value: number) => 
    `${(value * 100).toFixed(1)}%`,
    
  boolean: (value: boolean) => 
    value ? 'Yes' : 'No',
    
  status: (value: string) => 
    value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' '),
}

// Helper function to create export columns with common formatting
export function createExportColumns(config: Array<{
  key: string
  title: string
  width?: number
  type?: 'currency' | 'date' | 'datetime' | 'number' | 'percentage' | 'boolean' | 'status'
}>): ExportColumn[] {
  return config.map(col => ({
    key: col.key,
    title: col.title,
    width: col.width,
    format: col.type ? formatters[col.type] : undefined,
  }))
}
