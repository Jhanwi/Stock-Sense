# 📊 Stock Sense

> Stock Sense is a full-stack stock market analysis application that allows users to search stocks, view market and historical price data, manage a personal watchlist, and securely access their account.

🌐 **Live Demo:** [Stock Sense](https://stock-sense-jade.vercel.app/)

💻 **GitHub:** [Stock Sense Repository](https://github.com/Jhanwi/Stock-Sense)

---

## ✨ Features

- 🔐 **Authentication** — User registration and login with bcrypt password hashing and JWT authentication.
- 📊 **Dashboard** — View stock information, market overview, search stocks, and see recent activity.
- 📈 **Historical Data** — View historical stock prices including open, high, low, close, and volume.
- ⭐ **Watchlist** — Add, view, and remove stocks from a personal watchlist.
- 🔍 **Stock Analysis** — Search and analyze available stock information through REST APIs.
- 🌙 **Dark Mode** — Switch between light and dark themes.
- 📱 **Responsive UI** — Works across desktop, tablet, and mobile screen sizes.
- 🧪 **Testing** — Backend functionality tested using Vitest.
- 🐳 **Docker** — Docker configuration included for containerized development.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, TypeScript, Vite, CSS  
- **Backend:** Node.js, Express.js, TypeScript, REST APIs  
- **Database:** PostgreSQL  
- **Authentication:** JWT, bcrypt  
- **Data Pipeline:** Python, YFinance, Pandas  
- **Testing:** Vitest  
- **Tools:** Git, GitHub, Docker, Linux  
- **Deployment:** Vercel, Render

---

## 🏗️ Architecture

```text
React + TypeScript (Frontend)
            ↓
      REST API Calls
            ↓
Node.js + Express + TypeScript
            ↓
       PostgreSQL
            ↑
 Python ETL + YFinance + Pandas

```

---

## 📂 Project Structure

```text

Stock-Sense/
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       └── tests/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── assets/
├── etl/
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

## 🚀 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/Jhanwi/Stock-Sense.git
cd Stock-Sense
```

### 2.Backend
```bash
cd backend
npm install
```

#### Create a .env file:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_sense
DB_USER=stock_user
DB_PASSWORD=stock_password
PORT=5000
JWT_SECRET=your-secret-key
```

#### Start the backend:
```bash
npm run dev
```

#### Backend runs on:
```bash
http://localhost:5000
```

### 3.Frontend
#### Open another terminal:
```bash
cd frontend
npm install
```
#### Create .env:
```bash
VITE_API_BASE=http://localhost:5000/api
```
#### Start the frontend:
```bash
npm run dev
```

#### Open the URL shown by Vite, usually:
```bash
http://localhost:5173
```
---

## 🧪 Testing

#### Run backend tests with:
```bash
cd backend
npm test
```
---

## 🐳 Docker

#### Run the project using Docker:

```bash
docker compose up --build
```

#### Stop the containers:
```bash
docker compose down
```
---

## 📡 Main API Endpoints
```bash
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
GET    /api/stocks
GET    /api/stocks/:symbol/history
GET    /api/watchlist
POST   /api/watchlist
DELETE /api/watchlist/:symbol
```
---

## 🔄 Data Pipeline

Stock data is processed through a Python ETL workflow:
```text
YFinance → Pandas → Validation/Transformation → PostgreSQL → REST API → React
```

## ☁️ Deployment
```text
Frontend → Vercel
Backend  → Render
Database → PostgreSQL
```

### For production, configure the frontend environment variable:
```text
VITE_API_BASE=https://YOUR-RENDER-BACKEND-URL/api
```

<i>NOTE:- Do not commit .env files or database credentials to GitHub.</i>

---

## 🎯 Highlights

- Built a layered backend architecture using controllers, services, repositories, and middleware.
- Developed RESTful APIs using Node.js, Express.js, and TypeScript.
- Implemented JWT authentication and bcrypt password hashing.
- Integrated PostgreSQL for users, stocks, historical prices, and watchlists.
- Built a Python ETL pipeline using YFinance and Pandas.
- Added automated backend testing with Vitest.
- Deployed the application using Vercel and Render.

---

## 🔮 Future Improvements
- Interactive stock charts
- Real-time market updates
- Technical indicators
- Price alerts
- Portfolio tracking
- More comprehensive automated testing
- Scheduled cloud-based ETL jobs

---

## 👩‍💻 Author
**[Jhanwi Kumari](https://github.com/Jhanwi)**

<i>Computer Science Engineer | Backend/Full-Stack Developer</i>

