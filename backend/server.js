require("dotenv").config()
const express = require("express")
const mysql = require("mysql2/promise") // Using mysql2 for better performance and promise support
const cors = require("cors")
const rateLimit = require("express-rate-limit")
const helmet = require("helmet")
const XLSX = require("xlsx")
const fs = require("fs").promises // Using promise-based fs
const path = require("path")
const { body, param, validationResult } = require("express-validator")

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
})

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 uploads per 5 minutes
  message: {
    error: "Too many upload attempts, please try again later.",
  },
})

app.use(limiter)
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Database connection pool
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "excel_manager",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
}

const pool = mysql.createPool(dbConfig)

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log("Connected to MySQL database")
    connection.release()
  } catch (error) {
    console.error("Database connection failed:", error.message)
    process.exit(1)
  }
}

testConnection()

// Validation middleware
const validateTableName = (tableName) => {
  const regex = /^[a-zA-Z][a-zA-Z0-9_]{0,49}$/
  return regex.test(tableName)
}

const sanitizeColumnName = (columnName) => {
  return columnName
    .trim()
    .replace(/[^\w\s]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 64) // MySQL column name limit
}

// Error handling middleware
const handleError = (res, error, message = "Internal server error") => {
  console.error("Error:", error)

  if (error.code === "ER_TABLE_EXISTS_ERROR") {
    return res.status(409).json({
      success: false,
      message: "Table already exists with this name",
    })
  }

  if (error.code === "ER_NO_SUCH_TABLE") {
    return res.status(404).json({
      success: false,
      message: "Table not found",
    })
  }

  if (error.code === "ER_BAD_TABLE_ERROR") {
    return res.status(404).json({
      success: false,
      message: "Table does not exist",
    })
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "development" ? error.message : message,
  })
}

// Validation rules
const uploadValidation = [
  body("tableName")
    .isLength({ min: 1, max: 50 })
    .withMessage("Table name must be between 1 and 50 characters")
    .custom((value) => {
      if (!validateTableName(value)) {
        throw new Error("Table name must start with a letter and contain only letters, numbers, and underscores")
      }
      return true
    }),
  body("data")
    .isArray({ min: 1 })
    .withMessage("Data must be a non-empty array")
    .custom((value) => {
      if (value.length > 10000) {
        throw new Error("Maximum 10,000 rows allowed per upload")
      }
      return true
    }),
]

const tableNameValidation = [
  param("name").custom((value) => {
    if (!validateTableName(value)) {
      throw new Error("Invalid table name")
    }
    return true
  }),
]

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Upload route - FIXED VERSION
app.post("/upload", uploadLimiter, uploadValidation, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    })
  }

  const { tableName, data } = req.body

  try {
    console.log(`Processing upload for table: ${tableName}`)
    console.log(`Data rows received: ${data.length}`)

    // Filter out completely empty rows
    const filteredData = data.filter(row => {
      const values = Object.values(row)
      return values.some(value => value !== null && value !== undefined && value !== "" && value !== " ")
    })

    console.log(`Filtered data rows: ${filteredData.length}`)

    if (filteredData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid data rows found after filtering empty rows",
      })
    }

    // Sanitize column names
    const firstRow = filteredData[0]
    const columns = Object.keys(firstRow)
    const sanitizedColumns = columns.map(sanitizeColumnName)

    console.log(`Original columns: ${columns.join(', ')}`)
    console.log(`Sanitized columns: ${sanitizedColumns.join(', ')}`)

    // Check for duplicate column names after sanitization
    const uniqueColumns = [...new Set(sanitizedColumns)]
    if (uniqueColumns.length !== sanitizedColumns.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate column names detected after sanitization",
      })
    }

    // Create column definitions
    const columnDefs = sanitizedColumns.map((col) => `\`${col}\` TEXT`).join(", ")
    const createTableQuery = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ${columnDefs},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`

    console.log(`Creating table: ${tableName}`)
    await pool.execute(createTableQuery)
    console.log(`Table created successfully`)

    // Prepare data with sanitized column names
    const sanitizedData = filteredData.map((row) => {
      const sanitizedRow = {}
      columns.forEach((originalCol, index) => {
        sanitizedRow[sanitizedColumns[index]] = row[originalCol] || null
      })
      return sanitizedRow
    })

    // Insert data using individual inserts (more reliable than batch)
    console.log(`Starting data insertion...`)
    
    const placeholders = sanitizedColumns.map(() => '?').join(',')
    const insertQuery = `INSERT INTO \`${tableName}\` (${sanitizedColumns.map((c) => `\`${c}\``).join(",")}) VALUES (${placeholders})`
    
    let insertedCount = 0
    
    for (let i = 0; i < sanitizedData.length; i++) {
      const row = sanitizedData[i]
      const values = sanitizedColumns.map((col) => row[col])
      
      try {
        await pool.execute(insertQuery, values)
        insertedCount++
        
        // Progress logging every 100 rows
        if (insertedCount % 100 === 0) {
          console.log(`Inserted ${insertedCount}/${sanitizedData.length} rows`)
        }
      } catch (error) {
        console.error(`Error inserting row ${i + 1}:`, error.message)
        console.error(`Row data:`, row)
        // Continue with other rows instead of failing completely
      }
    }

    console.log(`Successfully inserted ${insertedCount}/${sanitizedData.length} rows`)

    res.json({
      success: true,
      message: `Successfully uploaded ${insertedCount} rows to table '${tableName}'`,
      rowsInserted: insertedCount,
      totalRows: sanitizedData.length,
    })
  } catch (error) {
    console.error(`Upload failed for table ${tableName}:`, error)
    handleError(res, error, "Failed to upload data")
  }
})

// Get list of tables
app.get("/get-tables", async (req, res) => {
  try {
    const [results] = await pool.execute(
      "SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME != 'information_schema'",
      [process.env.DB_NAME || "excel_manager"],
    )

    const tables = results.map((row) => ({
      name: row.TABLE_NAME,
      rows: row.TABLE_ROWS || 0,
      created: row.CREATE_TIME,
    }))

    res.json(tables)
  } catch (error) {
    handleError(res, error, "Failed to fetch tables")
  }
})

// Get table data with pagination
app.get("/get-table-data/:name", tableNameValidation, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Invalid table name",
    })
  }

  const tableName = req.params.name
  const page = Number.parseInt(req.query.page) || 1
  const limit = Math.min(Number.parseInt(req.query.limit) || 1000, 5000) // Max 5000 rows
  const offset = (page - 1) * limit

  try {
    // Get total count
    const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM \`${tableName}\``)
    const total = countResult[0].total

    // Get paginated data
    const [results] = await pool.execute(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [limit, offset])

    res.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    handleError(res, error, "Failed to fetch table data")
  }
})

// Delete table
app.delete("/delete-table/:name", tableNameValidation, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Invalid table name",
    })
  }

  const tableName = req.params.name

  try {
    await pool.execute(`DROP TABLE IF EXISTS \`${tableName}\``)
    res.json({
      success: true,
      message: `Table '${tableName}' deleted successfully`,
    })
  } catch (error) {
    handleError(res, error, "Failed to delete table")
  }
})

// Download as Excel
app.get("/download/:name", tableNameValidation, async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Invalid table name",
    })
  }

  const tableName = req.params.name
  const tempDir = path.join(__dirname, "temp")

  try {
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true })

    const [results] = await pool.execute(`SELECT * FROM \`${tableName}\``)

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found in table",
      })
    }

    // Remove internal columns
    const cleanedResults = results.map((row) => {
      const { id, created_at, updated_at, ...cleanRow } = row
      return cleanRow
    })

    const ws = XLSX.utils.json_to_sheet(cleanedResults)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data")

    const fileName = `${tableName}_${Date.now()}.xlsx`
    const filePath = path.join(tempDir, fileName)

    XLSX.writeFile(wb, filePath)

    res.download(filePath, `${tableName}.xlsx`, async (err) => {
      if (err) {
        console.error("Download error:", err)
      }

      // Clean up temp file
      try {
        await fs.unlink(filePath)
      } catch (unlinkError) {
        console.error("Failed to delete temp file:", unlinkError)
      }
    })
  } catch (error) {
    handleError(res, error, "Failed to generate download")
  }
})

// Global error handler
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error)
  res.status(500).json({
    success: false,
    message: "Internal server error",
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  })
})

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...")
  await pool.end()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  await pool.end()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
})