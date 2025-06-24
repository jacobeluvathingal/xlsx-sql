"use client"

import React from "react"
import "./ErrorBoundary.css"

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    })

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error caught by boundary:", error, errorInfo)
    }

    // In production, you might want to send this to an error reporting service
    // logErrorToService(error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">🚨</div>
            <h1>Oops! Something went wrong</h1>
            <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>

            {process.env.NODE_ENV === "development" && (
              <details className="error-details">
                <summary>Error Details (Development Mode)</summary>
                <div className="error-stack">
                  <h4>Error:</h4>
                  <pre>{this.state.error && this.state.error.toString()}</pre>
                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.handleReload} className="reload-btn">
                 Reload Page
              </button>
              <button onClick={() => (window.location.href = "/")} className="home-btn">
                 Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
