"use client"

import { useState, useEffect } from "react"
import "./DarkModeToggle.css"

const DarkModeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem("darkMode")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    const shouldUseDark = savedTheme === "true" || (savedTheme === null && prefersDark)

    setIsDarkMode(shouldUseDark)

    if (shouldUseDark) {
      document.body.classList.add("dark-mode")
    } else {
      document.body.classList.remove("dark-mode")
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)

    // Save preference to localStorage
    localStorage.setItem("darkMode", newDarkMode.toString())

    // Toggle body class
    if (newDarkMode) {
      document.body.classList.add("dark-mode")
    } else {
      document.body.classList.remove("dark-mode")
    }
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="dark-mode-toggle"
      title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
    >
      <span className="toggle-icon">{isDarkMode ? "🌙" : "☀️"}</span>
      <span className="toggle-text">{isDarkMode ? "Dark Mode" : "Light Mode"}</span>
    </button>
  )
}

export default DarkModeToggle
