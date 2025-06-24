"use client"

import { useEffect, useState, useCallback } from "react"
import "./TableList.css"

const TableList = ({ onNotification }) => {
  const [tables, setTables] = useState([])
  const [data, setData] = useState([])
  const [selectedTable, setSelectedTable] = useState("")
  const [loading, setLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" })
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(50)

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001"

  const fetchTables = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/get-tables`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const tablesData = await response.json()

      // Handle both old format (array of strings) and new format (array of objects)
      if (Array.isArray(tablesData)) {
        if (tablesData.length > 0 && typeof tablesData[0] === "object") {
          // New format with table info
          setTables(tablesData.map((table) => table.name || table))
        } else {
          // Old format - array of strings
          setTables(tablesData)
        }
      } else {
        setTables([])
      }
    } catch (error) {
      console.error("Error fetching tables:", error)
      onNotification("Failed to fetch tables. Please check your connection.", "error")
      setTables([])
    } finally {
      setLoading(false)
    }
  }, [API_BASE, onNotification])

  const viewData = async (tableName) => {
    if (selectedTable === tableName) {
      setSelectedTable("")
      setData([])
      return
    }

    setTableLoading((prev) => ({ ...prev, [tableName]: true }))
    setSelectedTable(tableName)
    setCurrentPage(1)
    setSearchTerm("")
    setSortConfig({ key: null, direction: "asc" })

    try {
      const response = await fetch(`${API_BASE}/get-table-data/${encodeURIComponent(tableName)}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()

      // Handle both old format (direct array) and new format (object with data property)
      let tableData = []
      if (result.data && Array.isArray(result.data)) {
        // New format with pagination
        tableData = result.data
      } else if (Array.isArray(result)) {
        // Old format - direct array
        tableData = result
      }

      setData(tableData)

      if (tableData.length === 0) {
        onNotification(`Table "${tableName}" is empty.`, "info")
      }
    } catch (error) {
      console.error(`Error fetching data for ${tableName}:`, error)
      onNotification(`Failed to fetch data for "${tableName}".`, "error")
      setData([])
    } finally {
      setTableLoading((prev) => ({ ...prev, [tableName]: false }))
    }
  }

  const deleteTable = async (tableName) => {
    const confirmMessage = `Are you sure you want to delete table "${tableName}"?\n\nThis action cannot be undone and will permanently delete all data in this table.`

    if (!window.confirm(confirmMessage)) return

    setTableLoading((prev) => ({ ...prev, [tableName]: true }))

    try {
      const response = await fetch(`${API_BASE}/delete-table/${encodeURIComponent(tableName)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        await fetchTables()

        if (tableName === selectedTable) {
          setSelectedTable("")
          setData([])
        }

        onNotification(`Table "${tableName}" deleted successfully.`, "success")
      } else {
        throw new Error(result.message || "Delete failed")
      }
    } catch (error) {
      console.error(`Error deleting table ${tableName}:`, error)
      onNotification(`Failed to delete table "${tableName}".`, "error")
    } finally {
      setTableLoading((prev) => ({ ...prev, [tableName]: false }))
    }
  }

  const downloadTable = (tableName) => {
    try {
      const downloadUrl = `${API_BASE}/download/${encodeURIComponent(tableName)}`
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `${tableName}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      onNotification(`Download started for "${tableName}".`, "success")
    } catch (error) {
      console.error(`Error downloading table ${tableName}:`, error)
      onNotification(`Failed to download "${tableName}".`, "error")
    }
  }

  // Filter and sort data
  const filteredData = data.filter((row) =>
    Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0

    const aVal = String(a[sortConfig.key] || "")
    const bVal = String(b[sortConfig.key] || "")

    if (sortConfig.direction === "asc") {
      return aVal.localeCompare(bVal, undefined, { numeric: true })
    } else {
      return bVal.localeCompare(aVal, undefined, { numeric: true })
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  if (loading) {
    return (
      <div className="table-list-container">
        <div className="loading-state">
          <div className="spinner large"></div>
          <p>Loading tables...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="table-list-container">
      <div className="section-header">
        <h2>🗂️ Database Tables</h2>
        <button onClick={fetchTables} className="refresh-btn" title="Refresh tables">
           Refresh
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No tables found</h3>
          <p>Upload your first Excel file to get started!</p>
        </div>
      ) : (
        <div className="tables-grid">
          {tables.map((tableName) => (
            <div key={tableName} className={`table-card ${selectedTable === tableName ? "active" : ""}`}>
              <div className="table-card-header">
                <h3 className="table-name" title={tableName}>
                   {tableName}
                </h3>
              </div>

              <div className="table-actions">
                <button
                  className={`action-btn view-btn ${selectedTable === tableName ? "active" : ""}`}
                  onClick={() => viewData(tableName)}
                  disabled={tableLoading[tableName]}
                >
                  {tableLoading[tableName] ? (
                    <>
                      <span className="spinner small"></span>
                      Loading...
                    </>
                  ) : selectedTable === tableName ? (
                    " Hide Data"
                  ) : (
                    " View Data"
                  )}
                </button>

                <button
                  className="action-btn download-btn"
                  onClick={() => downloadTable(tableName)}
                  title="Download as Excel"
                >
                   Download
                </button>

                <button
                  className="action-btn delete-btn"
                  onClick={() => deleteTable(tableName)}
                  disabled={tableLoading[tableName]}
                  title="Delete table"
                >
                   Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTable && data.length > 0 && (
        <div className="data-viewer">
          <div className="data-viewer-header">
            <h3> Data: {selectedTable}</h3>
            <div className="data-controls">
              <input
                type="text"
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="search-input"
              />
              <span className="data-count">
                {filteredData.length} of {data.length} rows
              </span>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="row-number-header">#</th>
                  {Object.keys(data[0] || {}).map((header) => (
                    <th
                      key={header}
                      onClick={() => handleSort(header)}
                      className={`sortable ${sortConfig.key === header ? `sorted-${sortConfig.direction}` : ""}`}
                      title={`Click to sort by ${header}`}
                    >
                      {header}
                      <span className="sort-indicator">
                        {sortConfig.key === header ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : " ↕️"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, index) => (
                  <tr key={startIndex + index}>
                    <td className="row-number">{startIndex + index + 1}</td>
                    {Object.values(row).map((value, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={value === "" || value === null ? "empty-cell" : ""}
                        title={String(value)}
                      >
                        {value === "" || value === null ? <span className="empty-indicator">—</span> : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Previous
              </button>

              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTable && data.length === 0 && !tableLoading[selectedTable] && (
        <div className="empty-data-state">
          <div className="empty-icon">📄</div>
          <h3>No data available</h3>
          <p>The table "{selectedTable}" exists but contains no data.</p>
        </div>
      )}
    </div>
  )
}

export default TableList
