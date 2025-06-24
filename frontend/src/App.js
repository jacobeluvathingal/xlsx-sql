"use client"

import { useState, useEffect } from "react"
import ExcelUpload from "./ExcelUpload"
import TableList from "./TableList"
import DarkModeToggle from "./DarkModeToggle"
import ErrorBoundary from "./ErrorBoundary"
import "./styles.css"

const App = () => {
  const [refresh, setRefresh] = useState(false)
  const [notification, setNotification] = useState(null)

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode")
    if (savedTheme === "true") {
      document.body.classList.add("dark-mode")
    }
  }, [])

  const showNotification = (message, type = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleUploadSuccess = () => {
    setRefresh(!refresh)
    showNotification("File uploaded successfully!", "success")
  }

  const handleUploadError = (error) => {
    showNotification(`Upload failed: ${error}`, "error")
  }

  return (
    <ErrorBoundary>
      <div className="app">
        {/* Header */}
        <header className="app-header">
          <div className="header-content">
            <h1>📁 Excel Database Manager</h1>
            <p className="app-description">
              Upload Excel files, manage database tables, and export your data with ease
            </p>
          </div>
          <div className="dark-toggle-wrapper">
            <DarkModeToggle />
          </div>
        </header>

        {/* Notification */}
        {notification && (
          <div className={`notification notification-${notification.type}`}>
            <span>{notification.message}</span>
            <button className="notification-close" onClick={() => setNotification(null)}>
              ×
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="main-content">
          <div className="upload-section">
            <ExcelUpload onUpload={handleUploadSuccess} onError={handleUploadError} />
          </div>

          <div className="tables-section">
            <TableList key={refresh} onNotification={showNotification} />
          </div>
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <p>
            Built with React & Node.js |{" "}
            <a href="https://github.com/jacobeluvathingal/xlsx-sql" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  )
}

export default App
