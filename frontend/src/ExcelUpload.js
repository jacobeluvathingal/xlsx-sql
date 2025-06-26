"use client"

import { useState, useCallback } from "react"
import * as XLSX from "xlsx"
import axios from "axios"
import "./ExcelUpload.css"

const ExcelUpload = ({ onUpload, onError }) => {
  const [excelData, setExcelData] = useState([])
  const [columns, setColumns] = useState([])
  const [tableName, setTableName] = useState("")
  const [fileName, setFileName] = useState("")
  const [fileStats, setFileStats] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001"

  const validateTableName = (name) => {
    const regex = /^[a-zA-Z][a-zA-Z0-9_]*$/
    return regex.test(name) && name.length <= 50
  }

  const formatCellValue = (value, cellAddress, worksheet) => {
    if (value === null || value === undefined) return ""

    if (typeof value === "boolean") {
      return value.toString()
    }

    if (typeof value === "number") {
      const cell = worksheet[cellAddress]
      if (cell && cell.t === "d") {
        return new Date(value).toLocaleDateString()
      }
      if (value > 25569 && value < 2958465) {
        const date = new Date((value - 25569) * 86400 * 1000) 
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString()
        }
      }
      return value.toString()
    }

    return String(value).trim()
  }

  const processExcelFile = useCallback(
    (file) => {
      const reader = new FileReader()

      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result
          const workbook = XLSX.read(bstr, { type: "binary", cellDates: true })
          const worksheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[worksheetName]

          const rawData = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
            raw: false,
            dateNF: "mm/dd/yyyy",
          })

          if (rawData.length === 0) {
            onError("The Excel file appears to be empty or has no valid data.")
            return
          }

          const processedData = rawData.map((row, index) => {
            const cleanedRow = {}
            Object.keys(row).forEach((key) => {
              const cleanKey = key.trim().replace(/[^\w\s]/g, "_")
              cleanedRow[cleanKey] = formatCellValue(
                row[key],
                XLSX.utils.encode_cell({ r: index + 1, c: Object.keys(row).indexOf(key) }),
                worksheet,
              )
            })
            return cleanedRow
          })

          const columnNames = Object.keys(processedData[0] || {})

          setExcelData(processedData)
          setColumns(columnNames)
          setFileStats({
            rows: processedData.length,
            columns: columnNames.length,
            size: (file.size / 1024).toFixed(2) + " KB",
          })

          const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^\w]/g, "_")
          setTableName(baseName.toLowerCase())
        } catch (error) {
          console.error("Error processing Excel file:", error)
          onError("Failed to process Excel file. Please ensure it's a valid .xlsx or .xls file.")
        }
      }

      reader.onerror = () => {
        onError("Failed to read the file. Please try again.")
      }

      reader.readAsBinaryString(file)
    },
    [onError],
  )

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFile = (file) => {
    if (!file) return

    const validTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      onError("Please select a valid Excel file (.xlsx or .xls)")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      onError("File size must be less than 10MB")
      return
    }

    setFileName(file.name)
    processExcelFile(file)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleUpload = () => {
    if (!tableName.trim()) {
      onError("Please enter a table name")
      return
    }

    if (!validateTableName(tableName)) {
      onError("Table name must start with a letter and contain only letters, numbers, and underscores")
      return
    }

    if (excelData.length === 0) {
      onError("Please select a file first")
      return
    }

    // Show success message immediately
    onUpload()

    // Reset form
    setTableName("")
    setExcelData([])
    setColumns([])
    setFileName("")
    setFileStats(null)

    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ""

    // Send to backend (fire and forget)
    axios
      .post(`${API_BASE}/upload`, {
        tableName: tableName.trim(),
        data: excelData,
      })
      .catch((error) => {
        console.error("Background upload error:", error)
      })
  }

  const clearData = () => {
    setExcelData([])
    setColumns([])
    setTableName("")
    setFileName("")
    setFileStats(null)
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ""
  }

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2> Upload Excel File</h2>
        <p>Drag and drop your Excel file or click to browse</p>
      </div>

      <div className="upload-form">
        <div
          className={`file-drop-zone ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
          <div className="drop-zone-content">
            <div className="upload-icon">📁</div>
            <p>{fileName ? `Selected: ${fileName}` : "Choose Excel file or drag it here"}</p>
            <small>Supports .xlsx and .xls files (max 10MB)</small>
          </div>
        </div>

        {fileStats && (
          <div className="file-stats">
            <h4>File Statistics</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Rows:</span>
                <span className="stat-value">{fileStats.rows.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Columns:</span>
                <span className="stat-value">{fileStats.columns}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Size:</span>
                <span className="stat-value">{fileStats.size}</span>
              </div>
            </div>
          </div>
        )}

        <div className="table-name-section">
          <label htmlFor="tableName">Table Name:</label>
          <input
            id="tableName"
            type="text"
            placeholder="Enter table name (e.g., sales_data_2024)"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            maxLength={50}
          />
          <small>Must start with a letter and contain only letters, numbers, and underscores</small>
        </div>

        <div className="upload-actions">
          <button onClick={handleUpload} disabled={!tableName.trim() || excelData.length === 0} className="upload-btn">
            Upload to Database
          </button>

          {excelData.length > 0 && (
            <button onClick={clearData} className="clear-btn">
              Clear
            </button>
          )}
        </div>
      </div>

      {excelData.length > 0 && (
        <div className="preview">
          <div className="preview-header">
            <h3>Data Preview</h3>
            <span className="preview-count">Showing first 10 rows of {excelData.length} total rows</span>
          </div>

          <div className="table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map((col) => (
                    <th key={col} title={col}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excelData.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    <td className="row-number">{i + 1}</td>
                    {columns.map((col) => (
                      <td key={col} className={row[col] === "" ? "empty-cell" : ""} title={String(row[col])}>
                        {String(row[col]) || <span className="empty-indicator">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {excelData.length > 10 && (
            <div className="preview-footer">
              <small>... and {excelData.length - 10} more rows</small>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ExcelUpload
