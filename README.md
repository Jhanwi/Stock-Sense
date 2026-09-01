# 📊 Stock Sense

> A full-stack stock market application I built to practice **backend development, REST APIs, PostgreSQL, React, TypeScript, and data processing.**

🌐 **Live Demo:** https://stock-sense-jade.vercel.app/

---

## ✨ Features

* 🔐 **Authentication** — User registration, login, JWT authentication, and password hashing
* 🔎 **Stock Search** — Search and view stock information
* 📈 **Price History** — View historical stock prices stored in PostgreSQL
* ⭐ **Watchlist** — Add, view, and remove stocks from a personal watchlist
* 📥 **ETL Pipeline** — Collect and process historical data using YFinance and Pandas
* 🔌 **REST API** — Backend APIs built with Express and TypeScript
* 🌓 **Responsive UI** — React interface with light and dark mode
* 🧪 **Testing** — Backend tests using Vitest
* 🐳 **Docker** — Docker Compose setup for local development
* ☁️ **Deployment** — Frontend on Vercel and backend on Render

---

## 🖥️ How It Works

The project has three main parts:

```text
                    ┌─────────────────┐
                    │  React + Vite   │
                    │    Frontend     │
                    └────────┬────────┘
                             │
                          REST API
                             │
                             ▼
                    ┌─────────────────┐
                    │ Node + Express  │
                    │    Backend      │
                    │   TypeScript    │
                    └────────┬────────┘
                             │
                         PostgreSQL
                             │
                             ▼
                    ┌─────────────────┐
                    │    Database     │
                    └─────────────────┘

Python ETL
    │
    ├── YFinance
    ├── Pandas
    └── PostgreSQL
```

The React frontend communicates with the Express backend through REST APIs.

The backend handles authentication, stock requests, watchlist operations, and database queries.

The Python ETL workflow collects historical stock data using YFinance, processes it with Pandas, and stores it in PostgreSQL.

---

## 🛠️ Tech Stack

### Frontend

* React.js
* TypeScript
* Vite
* CSS

### Backend

* Node.js
* Express.js
* TypeScript
* REST APIs

### Database

* PostgreSQL

### Authentication

* JWT
* bcrypt

### Data Processing

* Python
* YFinance
* Pandas

### Testing & Tools

* Vitest
* Git
* GitHub
* Docker
* Linux

### Deployment

* Vercel
* Render

---

## 📁 Project Structure

```text
Stock-Sense/
│
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       └── tests/
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── assets/
│
├── etl/
│
├── docker-compose.yml
├── requirements.txt
├── stock-display.py
├── stock-display-backup.py
└── README.md
```

---

## 📈 Data Pipeline

Historical stock data is collected and processed through the Python ETL workflow.

```text
YFinance
    ↓
Historical Stock Data
    ↓
Pandas Processing
    ↓
Data Validation
    ↓
PostgreSQL
    ↓
Express API
    ↓
React Frontend
```

The pipeline works with historical market data such as:

* Open price
* High price
* Low price
* Close price
* Volume

---

## 🔐 Authentication

The application uses JWT authentication for protected requests.

```text
Register / Login
       ↓
Credentials Checked
       ↓
JWT Token
       ↓
Protected API Request
       ↓
Backend Verification
```

Passwords are hashed using bcrypt before being stored.

---

## ⭐ Watchlist

Logged-in users can manage their own stock watchlist.

They can:

* Add a stock
* View saved stocks
* Remove a stock

Watchlist information is stored in PostgreSQL.

---

## 📡 Main API Endpoints

| Method | Endpoint                      | Purpose               |
| ------ | ----------------------------- | --------------------- |
| GET    | `/api/health`                 | Check backend status  |
| POST   | `/api/auth/register`          | Register a user       |
| POST   | `/api/auth/login`             | Log in a user         |
| GET    | `/api/stocks`                 | Get stock information |
| GET    | `/api/stocks/:symbol/history` | Get historical prices |
| GET    | `/api/watchlist`              | Get user's watchlist  |
| POST   | `/api/watchlist`              | Add a stock           |
| DELETE | `/api/watchlist/:symbol`      | Remove a stock        |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Jhanwi/Stock-Sense.git
cd Stock-Sense
```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
```

Create a `.env` file inside the `backend` directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_sense
DB_USER=stock_user
DB_PASSWORD=stock_password
PORT=5000
JWT_SECRET=your-secret-key
```

The backend runs on:

```text
http://localhost:5000
```

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_BASE=http://localhost:5000/api
```

Vite will display the local frontend URL in the terminal.

---

## 🧪 Running Tests

To run the backend tests:

```bash
cd backend
npm test
```

The project uses **Vitest** for backend testing.

---

## 🐳 Docker

The project includes Docker Compose configuration.

Start the project with:

```bash
docker compose up --build
```

Stop the containers with:

```bash
docker compose down
```

---

## ⚙️ Environment Variables

The backend requires database and authentication configuration.

Example:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_sense
DB_USER=stock_user
DB_PASSWORD=stock_password
PORT=5000
JWT_SECRET=your-secret-key
```

The frontend uses:

```env
VITE_API_BASE=http://localhost:5000/api
```

Do not commit real passwords, API keys, or secret values to GitHub.

---

## 🧠 What I Learned

Building Stock Sense helped me get practical experience with:

* REST API development using Express and TypeScript
* PostgreSQL and database queries
* JWT authentication and password hashing
* React frontend and API integration
* Python and Pandas for data processing
* YFinance and historical stock data
* Building an ETL workflow
* Backend testing with Vitest
* Docker
* Vercel and Render deployment
* Debugging frontend and backend issues

---

## 🔨 Future Improvements

* [ ] Add interactive stock charts
* [ ] Add real-time market updates
* [ ] Add technical indicators
* [ ] Add price alerts
* [ ] Add portfolio tracking
* [ ] Improve API error handling
* [ ] Add more automated tests
* [ ] Schedule the ETL process

---
## 📌 Project Status

🟢 **Active portfolio project**

I built Stock Sense to get hands-on experience with **backend development, TypeScript, Express, PostgreSQL, REST APIs, React, and data processing.**

---

## 👩‍💻 Author

**Jhanwi Kumari**

[GitHub](https://github.com/Jhanwi)
