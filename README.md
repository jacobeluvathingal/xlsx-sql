# Excel Database Manager

A modern web application for uploading Excel files to MySQL database with a beautiful, responsive interface.

## Features

- Drag & Drop Upload - Easy Excel file uploading with visual feedback  
- Database Management - View, download, and delete database tables  
- Data Search & Sort - Search through data and sort by columns  
- Responsive Design - Works perfectly on desktop and mobile  
- Dark Mode - Toggle between light and dark themes  
- Secure - Input validation, rate limiting, and SQL injection protection  
- Fast - Optimized for large datasets with pagination  

## Quick Start

### Prerequisites  
- Node.js 18+  
- MySQL 8+  
- npm or yarn  

### Installation

1. Clone the repository  
   ```bash
   git clone https://github.com/jacobeluvathingal/xlsx-sql.git
   cd xlsx-sql
   ```

2. Install frontend dependencies  
   ```bash
   npm install
   ```

3. Install backend dependencies  
   ```bash
   cd backend
   npm install
   ```

4. Setup database  
   ```sql
   CREATE DATABASE excel_manager;
   ```

5. Configure environment  
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

6. Start the application  
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   npm start
   ```

7. Open your browser  
   ```
   http://localhost:3000
   ```

## Tech Stack

### Frontend

- React 18 - Modern React with hooks  
- CSS3 - Custom styling with CSS variables  
- Axios - HTTP client for API calls  
- XLSX - Excel file processing  

### Backend

- Node.js - Runtime environment  
- Express - Web framework  
- MySQL2 - Database driver with connection pooling  
- Helmet - Security middleware  
- Express Rate Limit - Rate limiting  
- Express Validator - Input validation  

## Project Structure

```
xlsx-sql/
├── src/
│   ├── components/
│   │   ├── App.tsx
│   │   ├── ExcelUpload.tsx
│   │   ├── TableList.tsx
│   │   ├── DarkModeToggle.tsx
│   │   └── ErrorBoundary.tsx
│   ├── styles/
│   │   ├── styles.css
│   │   ├── ExcelUpload.css
│   │   ├── TableList.css
│   │   └── DarkModeToggle.css
│   └── index.js
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── public/
├── package.json
└── README.md
```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=excel_manager
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## API Documentation

### Upload Excel File  
```
POST /upload
Content-Type: application/json

{
  "tableName": "sales_data",
  "data": [...]
}
```

### Get Tables  
```
GET /get-tables
```

### Get Table Data  
```
GET /get-table-data/:tableName
```

### Delete Table  
```
DELETE /delete-table/:tableName
```

### Download Table  
```
GET /download/:tableName
```

## Contributing

1. Fork the repository  
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)  
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)  
4. Push to the branch (`git push origin feature/AmazingFeature`)  
5. Open a Pull Request  

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Jacob Eluvathingal  
GitHub: [@jacobeluvathingal](https://github.com/jacobeluvathingal)
