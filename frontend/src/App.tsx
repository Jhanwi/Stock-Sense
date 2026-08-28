import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Brain,
  ChevronDown,
  CircleUserRound,
  LineChart,
  LogOut,
  Moon,
  Search,
  Settings,
  Star,
  Sun,
  TrendingDown,
  TrendingUp,
  Wallet,
  ShoppingCart,
  X,
} from "lucide-react";
import "./App.css";

const API_BASE = (
  import.meta.env.VITE_API_BASE || "http://localhost:5000/api"
).replace(/\/$/, "");

type Page =
  | "dashboard"
  | "prediction"
  | "watchlist"
  | "portfolio"
  | "transactions"
  | "profile";

type AuthPage = "login" | "signup";

type Stock = {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
};

type HistoryRow = {
  date?: string;
  timestamp?: string;
  open_price?: number;
  close_price?: number;
  high_price?: number;
  low_price?: number;
  volume?: number;

  open?: number;
  close?: number;
  high?: number;
  low?: number;
};

type Trade = {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  total: number;
  date: string;
};

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [authPage, setAuthPage] = useState<AuthPage>("login");

  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("token"))
  );

  const [username, setUsername] = useState(
    localStorage.getItem("username") || "Investor"
  );

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<Stock | null>(null);
  const [searchHistory, setSearchHistory] = useState<HistoryRow[]>([]);

  const [loading, setLoading] = useState(false);

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const [trades, setTrades] = useState<Trade[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("stockTrades") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    document.body.className = darkMode ? "dark" : "";
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("stockTrades", JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    if (loggedIn) {
      loadStocks();
      loadWatchlist();
    }
  }, [loggedIn]);

  async function getJson(response: Response) {
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      return {
        message: response.ok
          ? "Invalid server response."
          : `Server returned ${response.status}.`,
      };
    }
  }

  async function loadStocks() {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/stocks`);
      const data = await getJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to load stocks");
      }

      const result = Array.isArray(data) ? data : data.stocks || [];
      setStocks(result);
    } catch (error) {
      console.error("Failed to load stocks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWatchlist() {
    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/watchlist`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await getJson(response);

      if (!response.ok) return;

      const symbols = Array.isArray(data)
        ? data.map((item: any) => item.symbol)
        : [];

      setWatchlist(symbols);
    } catch (error) {
      console.error("Failed to load watchlist:", error);
    }
  }

  async function searchStock(symbol: string) {
    const cleanSymbol = symbol.trim().toUpperCase();

    if (!cleanSymbol) {
      alert("Please enter a stock symbol.");
      return;
    }

    setLoading(true);
    setSearch(cleanSymbol);

    try {
      let quote: Stock | null = null;

      const quoteResponse = await fetch(
        `${API_BASE}/stocks/${encodeURIComponent(cleanSymbol)}`
      );

      const quoteData = await getJson(quoteResponse);

      if (quoteResponse.ok && quoteData?.price !== undefined) {
        quote = {
          symbol: quoteData.symbol || cleanSymbol,
          name: quoteData.name || cleanSymbol,
          price: Number(quoteData.price),
          change: Number(quoteData.change || 0),
          changePercent: Number(quoteData.changePercent || 0),
          open:
            quoteData.open !== undefined
              ? Number(quoteData.open)
              : undefined,
          high:
            quoteData.high !== undefined
              ? Number(quoteData.high)
              : undefined,
          low:
            quoteData.low !== undefined
              ? Number(quoteData.low)
              : undefined,
          volume:
            quoteData.volume !== undefined
              ? Number(quoteData.volume)
              : undefined,
        };
      }

      const historyResponse = await fetch(
        `${API_BASE}/stocks/${encodeURIComponent(cleanSymbol)}/history`
      );

      const historyData = await getJson(historyResponse);

      let history: HistoryRow[] = [];

      if (Array.isArray(historyData)) {
        history = historyData;
      } else if (Array.isArray(historyData?.history)) {
        history = historyData.history;
      }

      if (!quote && !history.length) {
        throw new Error(
          quoteData.message ||
            `No market data found for ${cleanSymbol}. Check the Yahoo Finance symbol.`
        );
      }

      if (!quote && history.length) {
        const latest = history[history.length - 1];
        const previous =
          history.length > 1 ? history[history.length - 2] : null;

        const current = getClose(latest);
        const previousClose = previous
          ? getClose(previous)
          : current;

        const change = current - previousClose;

        quote = {
          symbol: cleanSymbol,
          name: cleanSymbol,
          price: current,
          change,
          changePercent:
            previousClose !== 0
              ? (change / previousClose) * 100
              : 0,
          open: getOpen(latest),
          high: getHigh(latest),
          low: getLow(latest),
          volume: getVolume(latest),
        };
      }

      if (quote && history.length) {
        const latest = history[history.length - 1];

        quote.open =
          quote.open !== undefined
            ? quote.open
            : getOpen(latest);

        quote.high =
          quote.high !== undefined
            ? quote.high
            : getHigh(latest);

        quote.low =
          quote.low !== undefined
            ? quote.low
            : getLow(latest);

        quote.volume =
          quote.volume !== undefined
            ? quote.volume
            : getVolume(latest);
      }

      setSearchResult(quote);
      setSearchHistory(history);
      setPage("prediction");
    } catch (error) {
      setSearchResult(null);
      setSearchHistory([]);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to find this stock."
      );
    } finally {
      setLoading(false);
    }
  }

  async function getIndex(symbol: string): Promise<Stock | null> {
    try {
      const response = await fetch(
        `${API_BASE}/stocks/${encodeURIComponent(symbol)}/history`
      );

      const data = await getJson(response);

      const history: HistoryRow[] = Array.isArray(data)
        ? data
        : data.history || [];

      if (!response.ok || !history.length) {
        return null;
      }

      const latest = history[history.length - 1];
      const previous =
        history.length > 1
          ? history[history.length - 2]
          : null;

      const price = getClose(latest);
      const previousPrice = previous
        ? getClose(previous)
        : price;

      const change = price - previousPrice;

      return {
        symbol,
        price,
        change,
        changePercent:
          previousPrice !== 0
            ? (change / previousPrice) * 100
            : 0,
      };
    } catch {
      return null;
    }
  }

  function loginSuccess(data: any, enteredUsername: string) {
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    localStorage.setItem("username", enteredUsername);

    if (data.user?.email) {
      localStorage.setItem("userEmail", data.user.email);
    }

    setUsername(enteredUsername);
    setLoggedIn(true);
    setPage("dashboard");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userEmail");

    setLoggedIn(false);
    setPage("dashboard");
    setAuthPage("login");
  }

  function navigate(nextPage: Page) {
    setPage(nextPage);
  }

  function executeTrade(
    type: "BUY" | "SELL",
    symbol: string,
    quantity: number,
    price: number
  ) {
    if (!quantity || quantity <= 0) {
      alert("Please enter a valid quantity.");
      return false;
    }

    if (!price || price <= 0) {
      alert("Current stock price is unavailable.");
      return false;
    }

    const trade: Trade = {
      id: `${Date.now()}-${Math.random()}`,
      symbol,
      type,
      quantity,
      price,
      total: quantity * price,
      date: new Date().toLocaleString("en-IN"),
    };

    setTrades((previous) => [trade, ...previous]);

    alert(
      `${type === "BUY" ? "Buy" : "Sell"} order completed successfully.\n\n` +
        `${quantity} × ${symbol}\n` +
        `Price: ₹${price.toFixed(2)}\n` +
        `Total: ₹${(quantity * price).toFixed(2)}`
    );

    return true;
  }

  function toggleWatchlist(symbol: string) {
    setWatchlist((previous) => {
      if (previous.includes(symbol)) {
        return previous.filter((item) => item !== symbol);
      }

      return [...previous, symbol];
    });
  }

  if (!loggedIn) {
    return authPage === "login" ? (
      <Login
        onLogin={loginSuccess}
        onSignup={() => setAuthPage("signup")}
      />
    ) : (
      <Signup
        onSignup={() => setAuthPage("login")}
        onLogin={() => setAuthPage("login")}
      />
    );
  }

  const filteredStocks = stocks.filter((stock) => {
    const value = search.toLowerCase();

    return (
      stock.symbol?.toLowerCase().includes(value) ||
      stock.name?.toLowerCase().includes(value)
    );
  });

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="brand"
            onClick={() => navigate("dashboard")}
          >
            <div className="brand-icon">
              <TrendingUp size={19} />
            </div>

            <span>Stock Sense</span>
          </button>

          <nav className="main-nav">
            <NavItem
              label="Dashboard"
              active={page === "dashboard"}
              onClick={() => navigate("dashboard")}
            />

            <NavItem
              label="Prediction"
              active={page === "prediction"}
              onClick={() => navigate("prediction")}
            />

            <NavItem
              label="Watchlist"
              active={page === "watchlist"}
              onClick={() => navigate("watchlist")}
            />

            <NavItem
              label="Portfolio"
              active={page === "portfolio"}
              onClick={() => navigate("portfolio")}
            />

            <NavItem
              label="Transactions"
              active={page === "transactions"}
              onClick={() => navigate("transactions")}
            />
          </nav>

          <div className="top-actions">
            <button
              className="notification-button"
              title="Notifications"
              onClick={() =>
                alert("No new market notifications.")
              }
            >
              <Bell size={31} />
              <span>1</span>
            </button>

            <button
              className="theme-button"
              title="Change theme"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </button>

            <button
              className="profile-icon-button"
              title="Open profile"
              onClick={() => navigate("profile")}
            >
              <CircleUserRound size={23} />
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        {page === "dashboard" && (
          <Dashboard
            username={username}
            stocks={filteredStocks}
            allStocks={stocks}
            watchlist={watchlist}
            search={search}
            setSearch={setSearch}
            loading={loading}
            navigate={navigate}
            onSearch={searchStock}
            getIndex={getIndex}
          />
        )}

        {page === "prediction" && (
          <Prediction
            search={search}
            setSearch={setSearch}
            searchResult={searchResult}
            history={searchHistory}
            onSearch={searchStock}
            loading={loading}
            watchlist={watchlist}
            onToggleWatchlist={toggleWatchlist}
            trades={trades}
            onTrade={executeTrade}
          />
        )}

        {page === "watchlist" && (
          <Watchlist
            watchlist={watchlist}
            navigate={navigate}
            onSearch={searchStock}
          />
        )}

        {page === "portfolio" && (
          <Portfolio
            trades={trades}
            navigate={navigate}
          />
        )}

        {page === "transactions" && (
          <Transactions
            trades={trades}
            navigate={navigate}
          />
        )}

        {page === "profile" && (
          <Profile
            username={username}
            setUsername={setUsername}
            logout={logout}
            navigate={navigate}
          />
        )}
      </main>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function Login({
  onLogin,
  onSignup,
}: {
  onLogin: (data: any, username: string) => void;
  onSignup: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: username,
          password,
        }),
      });

      const data = await response.json().catch(() => ({
        message: "Invalid server response.",
      }));

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      onLogin(data, username);
    } catch {
      setError("Cannot connect to backend.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-intro">
        <h1>Stock Sense</h1>

        <h2>AI-Powered Market Intelligence</h2>

        <p>✓ Analyze stocks.</p>
        <p>✓ Track investments.</p>
        <p>✓ Understand market movements.</p>
      </div>

      <div className="auth-box">
        <h2>Welcome back</h2>

        <p>
          Sign in to access your StockSense dashboard.
        </p>

        <label>USERNAME</label>

        <input
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label>PASSWORD</label>

        <div className="password-input">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <button className="auth-button" onClick={handleLogin}>
          Login
        </button>

        <div className="auth-link">
          Don't have an account?{" "}
          <button onClick={onSignup}>Create Account</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SIGNUP
========================================================= */

function Signup({
  onSignup,
  onLogin,
}: {
  onSignup: () => void;
  onLogin: () => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup() {
    setError("");

    if (!username || !email || !password || !confirm) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({
        message: "Invalid server response.",
      }));

      if (!response.ok) {
        setError(data.message || "Account creation failed.");
        return;
      }

      localStorage.setItem("username", username);
      localStorage.setItem("userEmail", email);

      alert("Account created successfully. Please sign in.");

      onSignup();
    } catch {
      setError("Cannot connect to backend.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-intro">
        <h1><i>StockSense</i></h1>

        <h2>AI-Powered Market Intelligence</h2>

        <p>✓ Analyze stocks.</p>
        <p>✓ Track investments.</p>
        <p>✓ Understand market movements.</p>
      </div>

      <div className="auth-box signup-box">
        <h2>Create your account</h2>

        <p>Start using AI-powered stock intelligence.</p>

        <label>USERNAME</label>

        <input
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <div className="form-grid">
          <div>
            <label>FIRST NAME</label>

            <input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div>
            <label>MIDDLE NAME (OPTIONAL)</label>

            <input
              placeholder="Middle name"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid">
          <div>
            <label>LAST NAME</label>

            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div>
            <label>PHONE NUMBER</label>

            <input
              type="tel"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid">
          <div>
            <label>EMAIL ADDRESS</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label>DATE OF BIRTH</label>

            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid">
          <div>
            <label>PASSWORD</label>

            <div className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label>CONFIRM PASSWORD</label>

            <div className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button className="auth-button" onClick={handleSignup}>
          Create Account
        </button>

        <div className="auth-link">
          Already have an account?{" "}
          <button onClick={onLogin}>Sign In</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  username,
  stocks,
  allStocks,
  watchlist,
  search,
  setSearch,
  loading,
  navigate,
  onSearch,
  getIndex,
}: {
  username: string;
  stocks: Stock[];
  allStocks: Stock[];
  watchlist: string[];
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  navigate: (page: Page) => void;
  onSearch: (symbol: string) => void;
  getIndex: (symbol: string) => Promise<Stock | null>;
}) {
  const [indices, setIndices] = useState<
    { name: string; stock: Stock | null }[]
  >([
    { name: "SENSEX", stock: null },
    { name: "NIFTY BANK", stock: null },
    { name: "INDIA VIX", stock: null },
  ]);

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
      ? "Good afternoon"
      : "Good evening";

  useEffect(() => {
    async function loadIndices() {
      const result = await Promise.all([
        getIndex("^BSESN"),
        getIndex("^NSEBANK"),
        getIndex("^INDIAVIX"),
      ]);

      setIndices([
        { name: "SENSEX", stock: result[0] },
        { name: "NIFTY BANK", stock: result[1] },
        { name: "INDIA VIX", stock: result[2] },
      ]);
    }

    loadIndices();
  }, []);

  const tracked = allStocks.filter((stock) =>
    watchlist.includes(stock.symbol)
  );

  const positive = tracked.filter(
    (stock) => (stock.changePercent || 0) > 0
  ).length;

  const negative = tracked.filter(
    (stock) => (stock.changePercent || 0) < 0
  ).length;

  const summary =
    tracked.length > 0
      ? `You are currently tracking ${tracked
          .map((stock) => stock.symbol)
          .join(", ")}. ${positive} ${
          positive === 1 ? "stock is" : "stocks are"
        } showing positive movement and ${negative} ${
          negative === 1 ? "is" : "are"
        } showing negative movement.`
      : "Your personalized market view is ready. Search for a stock and add it to your watchlist to receive a more personalized view.";

  return (
    <section className="dashboard">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">MARKET INTELLIGENCE</p>

          <h1>
            {greeting}, {username}
          </h1>

          <p className="dashboard-subtitle">
            Your personalized market overview.
          </p>
        </div>

        <div className="dashboard-search">
          <div className="search-box">
            <Search size={18} />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSearch(search);
                }
              }}
              placeholder="Search any stock e.g. TCS.NS, AAPL"
            />
          </div>

          <button
            className="primary-button"
            onClick={() => onSearch(search)}
          >
            Analyze
          </button>
        </div>
      </div>

      <div className="market-heading">
        <div>
          <h2>Market Overview</h2>
          <span>Updated {today}</span>
        </div>

        <span className="market-open">
          ● Market Open
        </span>
      </div>

      <div className="market-grid">
        {indices.map((item) => (
          <MarketCard
            key={item.name}
            title={item.name}
            value={
              item.stock?.price !== undefined
                ? item.stock.price.toFixed(2)
                : "--"
            }
            change={
              item.stock?.changePercent !== undefined
                ? `${
                    item.stock.changePercent >= 0
                      ? "↑"
                      : "↓"
                  } ${Math.abs(
                    item.stock.changePercent
                  ).toFixed(2)}%`
                : "No data"
            }
            positive={
              (item.stock?.changePercent || 0) >= 0
            }
          />
        ))}
      </div>

      <div className="dashboard-columns">
        <div className="left-column">
          <div className="card ai-card">
            <div className="card-title">
              <div className="title-icon">
                <Brain size={19} />
              </div>

              <div>
                <h3>AI Market Summary</h3>
                <p>Personalized market intelligence</p>
              </div>
            </div>

            <p className="summary">{summary}</p>

            <button
              className="text-link"
              onClick={() => navigate("prediction")}
            >
              Explore predictions →
            </button>
          </div>

          <div className="card">
            <div className="card-heading">
              <div>
                <h3>Portfolio Snapshot</h3>
                <p>Your current investment overview</p>
              </div>

              <button
                className="outline-button"
                onClick={() => navigate("portfolio")}
              >
                View Portfolio
              </button>
            </div>

            <div className="empty">
              <Wallet size={27} />

              <p>Your portfolio is currently empty.</p>

              <button
                className="primary-button"
                onClick={() => navigate("prediction")}
              >
                Explore Stocks
              </button>
            </div>
          </div>

          <MarketTrend stocks={allStocks} />
        </div>

        <div className="right-column">
          <div className="card">
            <div className="card-heading">
              <div>
                <h3>Your Watchlist</h3>
                <p>{watchlist.length} stocks tracked</p>
              </div>

              <button
                className="outline-button"
                onClick={() => navigate("watchlist")}
              >
                View All
              </button>
            </div>

            {watchlist.length === 0 ? (
              <div className="empty">
                <Star size={25} />

                <p>Your watchlist is empty.</p>

                <button
                  className="primary-button"
                  onClick={() => navigate("prediction")}
                >
                  Explore Stocks
                </button>
              </div>
            ) : (
              <div className="watchlist-list">
                {watchlist.slice(0, 5).map((symbol) => (
                  <div className="watch-row" key={symbol}>
                    <span className="stock-circle">
                      {symbol.slice(0, 2)}
                    </span>

                    <strong>{symbol}</strong>

                    <Star size={16} className="star" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-heading">
              <div>
                <h3>Recent Activity</h3>
                <p>Your latest market activity</p>
              </div>

              <button
                className="outline-button"
                onClick={() => navigate("transactions")}
              >
                View All
              </button>
            </div>

            {stocks.length > 0 ? (
              <div className="activity">
                {stocks.slice(0, 2).map((stock) => (
                  <div
                    className="activity-row"
                    key={stock.symbol}
                  >
                    <div>
                      <strong>{stock.symbol}</strong>
                      <span>{today}</span>
                    </div>

                    <b
                      className={
                        (stock.changePercent || 0) >= 0
                          ? "up"
                          : "down"
                      }
                    >
                      {(stock.changePercent || 0) >= 0
                        ? "UP"
                        : "DOWN"}
                    </b>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">
                <TrendingUp size={25} />

                <p>No recent activity.</p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-heading">
              <div>
                <h3>Available Stocks</h3>
                <p>Stocks loaded from your backend</p>
              </div>

              <span className="count-badge">
                {stocks.length} stocks
              </span>
            </div>

            {loading ? (
              <div className="loading">Loading stocks...</div>
            ) : stocks.length === 0 ? (
              <div className="empty">
                <Search size={25} />

                <p>No stocks available.</p>
              </div>
            ) : (
              <div className="stock-list">
                {stocks.slice(0, 5).map((stock) => (
                  <div className="stock-row" key={stock.symbol}>
                    <span className="stock-circle">
                      {stock.symbol.slice(0, 2)}
                    </span>

                    <div className="stock-name">
                      <strong>{stock.symbol}</strong>

                      <span>
                        {stock.name || "Market stock"}
                      </span>
                    </div>

                    <strong>
                      {stock.price !== undefined
                        ? `₹${stock.price.toFixed(2)}`
                        : "--"}
                    </strong>

                    <button
                      className="small-analyze"
                      onClick={() => onSearch(stock.symbol)}
                    >
                      Analyze
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PREDICTION / STOCK DETAIL PAGE
========================================================= */

function Prediction({
  search,
  setSearch,
  searchResult,
  history,
  onSearch,
  loading,
  watchlist,
  onToggleWatchlist,
  trades,
  onTrade,
}: {
  search: string;
  setSearch: (value: string) => void;
  searchResult: Stock | null;
  history: HistoryRow[];
  onSearch: (symbol: string) => void;
  loading: boolean;
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
  trades: Trade[];
  onTrade: (
    type: "BUY" | "SELL",
    symbol: string,
    quantity: number,
    price: number
  ) => boolean;
}) {
  const [period, setPeriod] = useState("1Y");

  const [tradeType, setTradeType] =
    useState<"BUY" | "SELL">("BUY");

  const [quantity, setQuantity] = useState(1);

  const [showTradeBox, setShowTradeBox] = useState(true);

  const chartHistory = useMemo(() => {
    const count =
      period === "1M"
        ? 22
        : period === "3M"
        ? 66
        : period === "6M"
        ? 132
        : history.length;

    return history.slice(-Math.max(count, 2));
  }, [history, period]);

  const chartValues = chartHistory
    .map((row) => getClose(row))
    .filter((value) => Number.isFinite(value) && value > 0);

  const currentPrice = searchResult?.price || 0;

  /*
    This is intentionally a lightweight frontend prediction preview.
    If your backend later exposes a real prediction endpoint, replace
    predictedPrice with that API value.
  */
  const predictedPrice =
    currentPrice > 0
      ? currentPrice *
        (1 + (searchResult?.changePercent || 0) / 1000)
      : 0;

  const movement = predictedPrice - currentPrice;

  const movementPercent =
    currentPrice > 0
      ? (movement / currentPrice) * 100
      : 0;

  const isUp = movement >= 0;

  const stockTrades = searchResult
    ? trades.filter(
        (trade) => trade.symbol === searchResult.symbol
      )
    : [];

  const estimatedTotal = currentPrice * quantity;

  return (
    <section className="stock-detail-page">
      <div className="stock-search-header">
        <div>
          <p className="eyebrow">STOCK ANALYSIS</p>

          <h1>Analyze any stock</h1>

          <p>
            Search any Yahoo Finance symbol to view market
            data, history, insights and trade actions.
          </p>
        </div>

        <div className="stock-search-bar">
          <Search size={18} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearch(search);
              }
            }}
            placeholder="RELIANCE.NS, TCS.NS, AAPL, MSFT..."
          />

          <button
            className="primary-button"
            onClick={() => onSearch(search)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Analyze"}
          </button>
        </div>
      </div>

      {!searchResult ? (
        <div className="analysis-empty card">
          <div className="analysis-empty-icon">
            <LineChart size={38} />
          </div>

          <h2>Search for a stock</h2>

          <p>
            Enter any valid Yahoo Finance symbol above.
          </p>

          <div className="example-symbols">
            <button onClick={() => onSearch("RELIANCE.NS")}>
              RELIANCE.NS
            </button>

            <button onClick={() => onSearch("TCS.NS")}>
              TCS.NS
            </button>

            <button onClick={() => onSearch("INFY.NS")}>
              INFY.NS
            </button>

            <button onClick={() => onSearch("AAPL")}>
              AAPL
            </button>

            <button onClick={() => onSearch("NVDA")}>
              NVDA
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* STOCK HEADER */}

          <div className="stock-hero card">
            <div className="stock-hero-info">
              <div className="big-stock-circle">
                {searchResult.symbol.slice(0, 2)}
              </div>

              <div>
                <h2>{searchResult.symbol}</h2>

                <p>
                  {searchResult.name ||
                    searchResult.symbol}
                </p>

                <span className="exchange-label">
                  EQUITY • YAHOO FINANCE
                </span>
              </div>
            </div>

            <div className="stock-hero-actions">
              <button
                className={
                  watchlist.includes(searchResult.symbol)
                    ? "watch-button active"
                    : "watch-button"
                }
                onClick={() =>
                  onToggleWatchlist(searchResult.symbol)
                }
              >
                <Star size={16} />

                {watchlist.includes(searchResult.symbol)
                  ? "In Watchlist"
                  : "Add to Watchlist"}
              </button>

              <button
                className="buy-hero-button"
                onClick={() => {
                  setTradeType("BUY");
                  setShowTradeBox(true);

                  document
                    .getElementById("trade-section")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
              >
                <ShoppingCart size={16} />
                Buy Stock
              </button>
            </div>
          </div>

          {/* PRICE SUMMARY */}

          <div className="price-summary card">
            <div className="price-main">
              <strong>
                ₹{currentPrice.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>

              <span
                className={
                  (searchResult.change || 0) >= 0
                    ? "price-change up"
                    : "price-change down"
                }
              >
                {(searchResult.change || 0) >= 0
                  ? "↑"
                  : "↓"}{" "}
                {Math.abs(
                  searchResult.change || 0
                ).toFixed(2)}{" "}
                (
                {(searchResult.changePercent || 0) >= 0
                  ? "+"
                  : ""}
                {(searchResult.changePercent || 0).toFixed(
                  2
                )}
                %)
              </span>
            </div>

            <div className="price-divider" />

            <div className="ohlcv-grid">
              <StatItem
                label="OPEN"
                value={formatPrice(searchResult.open)}
              />

              <StatItem
                label="HIGH"
                value={formatPrice(searchResult.high)}
                valueClass="up"
              />

              <StatItem
                label="LOW"
                value={formatPrice(searchResult.low)}
                valueClass="down"
              />

              <StatItem
                label="VOLUME"
                value={formatVolume(searchResult.volume)}
              />
            </div>
          </div>

          {/* HISTORY */}

          <div className="card historical-card">
            <div className="historical-header">
              <div>
                <h2>Historical Price Performance</h2>

                <p>
                  Daily closing price history for{" "}
                  {searchResult.symbol}
                </p>
              </div>

              <div className="period-buttons">
                {["1M", "3M", "6M", "1Y"].map(
                  (item) => (
                    <button
                      key={item}
                      className={
                        period === item ? "selected" : ""
                      }
                      onClick={() => setPeriod(item)}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="latest-market-row">
              <StatItem
                label="DATE"
                value={
                  history.length
                    ? formatDate(
                        getDate(
                          history[history.length - 1]
                        )
                      )
                    : "--"
                }
              />

              <StatItem
                label="OPEN"
                value={formatPrice(
                  searchResult.open
                )}
              />

              <StatItem
                label="HIGH"
                value={formatPrice(
                  searchResult.high
                )}
                valueClass="up"
              />

              <StatItem
                label="LOW"
                value={formatPrice(
                  searchResult.low
                )}
                valueClass="down"
              />

              <StatItem
                label="VOLUME"
                value={formatVolume(
                  searchResult.volume
                )}
              />
            </div>

            {chartValues.length >= 2 ? (
              <PriceChart
                rows={chartHistory}
              />
            ) : (
              <div className="chart-empty">
                Historical chart data is not available
                for this stock.
              </div>
            )}
          </div>

          {/* BUY / SELL */}

          <div
            id="trade-section"
            className="trade-layout"
          >
            <div className="card trade-card">
              <div className="trade-header">
                <div>
                  <p className="trade-step">
                    STEP 1
                  </p>

                  <h2>Buy or Sell {searchResult.symbol}</h2>

                  <p>
                    Place a simulated order directly from
                    this stock analysis page.
                  </p>
                </div>

                <button
                  className="close-trade-button"
                  onClick={() =>
                    setShowTradeBox(!showTradeBox)
                  }
                >
                  {showTradeBox ? (
                    <X size={18} />
                  ) : (
                    "+"
                  )}
                </button>
              </div>

              {showTradeBox && (
                <>
                  <div className="trade-step-block">
                    <p className="trade-step">
                      STEP 2
                    </p>

                    <div className="trade-tabs">
                      <button
                        className={
                          tradeType === "BUY"
                            ? "buy-tab active"
                            : "buy-tab"
                        }
                        onClick={() =>
                          setTradeType("BUY")
                        }
                      >
                        <TrendingUp size={17} />
                        BUY
                      </button>

                      <button
                        className={
                          tradeType === "SELL"
                            ? "sell-tab active"
                            : "sell-tab"
                        }
                        onClick={() =>
                          setTradeType("SELL")
                        }
                      >
                        <TrendingDown size={17} />
                        SELL
                      </button>
                    </div>
                  </div>

                  <div className="trade-step-block">
                    <p className="trade-step">
                      STEP 3
                    </p>

                    <label>QUANTITY</label>

                    <div className="quantity-control">
                      <button
                        onClick={() =>
                          setQuantity(
                            Math.max(1, quantity - 1)
                          )
                        }
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(
                            Math.max(
                              1,
                              Number(e.target.value)
                            )
                          )
                        }
                      />

                      <button
                        onClick={() =>
                          setQuantity(quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="trade-summary">
                    <p className="trade-step">
                      STEP 4
                    </p>

                    <div className="trade-summary-row">
                      <span>Stock</span>
                      <strong>
                        {searchResult.symbol}
                      </strong>
                    </div>

                    <div className="trade-summary-row">
                      <span>Market Price</span>
                      <strong>
                        ₹{currentPrice.toFixed(2)}
                      </strong>
                    </div>

                    <div className="trade-summary-row">
                      <span>Quantity</span>
                      <strong>{quantity}</strong>
                    </div>

                    <div className="trade-summary-row total">
                      <span>Estimated Total</span>

                      <strong>
                        ₹
                        {estimatedTotal.toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}
                      </strong>
                    </div>

                    <button
                      className={
                        tradeType === "BUY"
                          ? "confirm-buy-button"
                          : "confirm-sell-button"
                      }
                      onClick={() => {
                        const completed = onTrade(
                          tradeType,
                          searchResult.symbol,
                          quantity,
                          currentPrice
                        );

                        if (completed) {
                          setQuantity(1);
                        }
                      }}
                    >
                      {tradeType === "BUY"
                        ? `Buy ${quantity} ${
                            quantity === 1
                              ? "Share"
                              : "Shares"
                          }`
                        : `Sell ${quantity} ${
                            quantity === 1
                              ? "Share"
                              : "Shares"
                          }`}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* AI INSIGHT */}

            <div className="card ai-insight-card">
              <div className="ai-insight-title">
                <div className="sparkle">✦</div>

                <div>
                  <h2>AI Insight</h2>
                  <p>Model-based price outlook</p>
                </div>
              </div>

              <div className="prediction-comparison">
                <div>
                  <span>CURRENT</span>

                  <strong>
                    ₹{currentPrice.toFixed(2)}
                  </strong>
                </div>

                <div className="ai-connector">
                  AI
                </div>

                <div>
                  <span>PREDICTED</span>

                  <strong className={isUp ? "up" : "down"}>
                    ₹{predictedPrice.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="insight-grid">
                <div>
                  <span>DIRECTION</span>

                  <b
                    className={
                      isUp
                        ? "direction-up"
                        : "direction-down"
                    }
                  >
                    {isUp ? "↑ UPWARD" : "↓ DOWNWARD"}
                  </b>
                </div>

                <div>
                  <span>MOVEMENT</span>

                  <strong
                    className={isUp ? "up" : "down"}
                  >
                    {isUp ? "+" : ""}
                    ₹{movement.toFixed(2)} (
                    {isUp ? "+" : ""}
                    {movementPercent.toFixed(2)}
                    %)
                  </strong>
                </div>
              </div>

              <p className="insight-description">
                Based on the available market movement,
                the model preview estimates a{" "}
                {isUp ? "slightly upward" : "slightly downward"}{" "}
                movement from the current price.
              </p>

              <small className="disclaimer">
                AI-generated prediction for
                informational purposes only. This is not
                financial advice.
              </small>
            </div>
          </div>

          {/* RECENT ACTIVITY */}

          <div className="card recent-stock-activity">
            <div className="card-heading">
              <div>
                <h2>Recent Activity</h2>

                <p>
                  Your transactions for{" "}
                  {searchResult.symbol}
                </p>
              </div>

              <span className="count-badge">
                {stockTrades.length} trades
              </span>
            </div>

            {stockTrades.length === 0 ? (
              <div className="empty">
                <LineChart size={27} />

                <p>
                  No transactions for this stock yet.
                </p>
              </div>
            ) : (
              <div className="trade-history">
                {stockTrades.slice(0, 5).map((trade) => (
                  <div
                    className="trade-history-row"
                    key={trade.id}
                  >
                    <div>
                      <strong>{trade.type}</strong>

                      <span>{trade.date}</span>
                    </div>

                    <div>
                      <span>
                        {trade.quantity} shares
                      </span>

                      <strong>
                        ₹{trade.total.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* =========================================================
   WATCHLIST
========================================================= */

function Watchlist({
  watchlist,
  navigate,
  onSearch,
}: {
  watchlist: string[];
  navigate: (page: Page) => void;
  onSearch: (symbol: string) => void;
}) {
  return (
    <section>
      <PageHeader
        title="Watchlist"
        subtitle="Keep track of stocks you're interested in."
      />

      <div className="card large-card">
        {watchlist.length ? (
          <div className="watchlist-page">
            {watchlist.map((symbol) => (
              <div className="stock-row" key={symbol}>
                <span className="stock-circle">
                  {symbol.slice(0, 2)}
                </span>

                <strong>{symbol}</strong>

                <button
                  className="small-analyze"
                  onClick={() => onSearch(symbol)}
                >
                  Analyze
                </button>

                <Star size={17} className="star" />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Star size={30} />

            <p>Your watchlist is empty.</p>

            <button
              className="primary-button"
              onClick={() => navigate("prediction")}
            >
              Explore Stocks
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   PORTFOLIO
========================================================= */

function Portfolio({
  trades,
  navigate,
}: {
  trades: Trade[];
  navigate: (page: Page) => void;
}) {
  const invested = trades
    .filter((trade) => trade.type === "BUY")
    .reduce((sum, trade) => sum + trade.total, 0);

  const sold = trades
    .filter((trade) => trade.type === "SELL")
    .reduce((sum, trade) => sum + trade.total, 0);

  const balance = invested - sold;

  return (
    <section>
      <PageHeader
        title="Portfolio"
        subtitle="Monitor your simulated investments in one place."
      />

      <div className="summary-grid">
        <SummaryCard
          title="Buy Value"
          value={`₹${invested.toFixed(2)}`}
        />

        <SummaryCard
          title="Sell Value"
          value={`₹${sold.toFixed(2)}`}
        />

        <SummaryCard
          title="Net Position"
          value={`₹${balance.toFixed(2)}`}
        />
      </div>

      <div className="card large-card">
        {trades.length === 0 ? (
          <div className="empty">
            <Wallet size={30} />

            <p>Your portfolio is currently empty.</p>

            <button
              className="primary-button"
              onClick={() => navigate("prediction")}
            >
              Explore Stocks
            </button>
          </div>
        ) : (
          <div className="portfolio-trades">
            {trades.map((trade) => (
              <div
                className="portfolio-trade-row"
                key={trade.id}
              >
                <span
                  className={
                    trade.type === "BUY"
                      ? "trade-badge buy"
                      : "trade-badge sell"
                  }
                >
                  {trade.type}
                </span>

                <strong>{trade.symbol}</strong>

                <span>
                  {trade.quantity} shares
                </span>

                <strong>
                  ₹{trade.total.toFixed(2)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   TRANSACTIONS
========================================================= */

function Transactions({
  trades,
  navigate,
}: {
  trades: Trade[];
  navigate: (page: Page) => void;
}) {
  return (
    <section>
      <PageHeader
        title="Transactions"
        subtitle="Review your investment activity."
      />

      <div className="card large-card">
        {trades.length === 0 ? (
          <div className="empty">
            <LineChart size={30} />

            <p>No transactions yet.</p>

            <button
              className="primary-button"
              onClick={() => navigate("prediction")}
            >
              Explore Stocks
            </button>
          </div>
        ) : (
          <div className="transaction-table">
            <div className="transaction-head">
              <span>TYPE</span>
              <span>STOCK</span>
              <span>QUANTITY</span>
              <span>PRICE</span>
              <span>TOTAL</span>
            </div>

            {trades.map((trade) => (
              <div
                className="transaction-row"
                key={trade.id}
              >
                <b
                  className={
                    trade.type === "BUY"
                      ? "up"
                      : "down"
                  }
                >
                  {trade.type}
                </b>

                <strong>{trade.symbol}</strong>

                <span>{trade.quantity}</span>

                <span>
                  ₹{trade.price.toFixed(2)}
                </span>

                <strong>
                  ₹{trade.total.toFixed(2)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   PROFILE
========================================================= */

function Profile({
  username,
  setUsername,
  logout,
  navigate,
}: {
  username: string;
  setUsername: (value: string) => void;
  logout: () => void;
  navigate: (page: Page) => void;
}) {
  const [email, setEmail] = useState(
    localStorage.getItem("userEmail") || ""
  );

  function save() {
    localStorage.setItem("username", username);
    localStorage.setItem("userEmail", email);

    alert("Profile updated.");
  }

  return (
    <section>
      <PageHeader
        title="Profile"
        subtitle="Manage your Stock Sense account."
      />

      <div className="profile-grid">
        <div className="card profile-card">
          <CircleUserRound size={55} />

          <h2>{username}</h2>

          <p>{email || "No email available"}</p>
        </div>

        <div className="card">
          <div className="card-title">
            <Settings size={20} />

            <div>
              <h3>Account Settings</h3>
              <p>Update your account information</p>
            </div>
          </div>

          <label>USERNAME</label>

          <input
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
          />

          <label>EMAIL</label>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className="primary-button save-button"
            onClick={save}
          >
            Save Changes
          </button>

          <button className="logout-large" onClick={logout}>
            <LogOut size={17} />
            Log out
          </button>

          <button
            className="back-link"
            onClick={() => navigate("dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PRICE CHART
========================================================= */

function PriceChart({
  rows,
}: {
  rows: HistoryRow[];
}) {
  const width = 1000;
  const height = 350;

  const values = rows
    .map((row) => getClose(row))
    .filter((value) => value > 0);

  if (values.length < 2) {
    return (
      <div className="chart-empty">
        Not enough historical data.
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x =
        (index / (values.length - 1)) *
        width;

      const y =
        height -
        ((value - min) / range) *
          (height - 30) -
        15;

      return `${x},${y}`;
    })
    .join(" ");

  const first = values[0];
  const last = values[values.length - 1];

  const positive = last >= first;

  return (
    <div className="chart-wrapper">
      <div className="chart-y-labels">
        <span>₹{max.toFixed(0)}</span>
        <span>
          ₹{((max + min) / 2).toFixed(0)}
        </span>
        <span>₹{min.toFixed(0)}</span>
      </div>

      <svg
        className="history-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1="20"
          x2={width}
          y2="20"
          className="chart-grid-line"
        />

        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          className="chart-grid-line"
        />

        <line
          x1="0"
          y1={height - 20}
          x2={width}
          y2={height - 20}
          className="chart-grid-line"
        />

        <polyline
          points={points}
          fill="none"
          className={
            positive
              ? "history-line positive"
              : "history-line negative"
          }
        />
      </svg>
    </div>
  );
}

/* =========================================================
   MARKET TREND
========================================================= */

function MarketTrend({
  stocks,
}: {
  stocks: Stock[];
}) {
  const values = stocks
    .filter((stock) => stock.price !== undefined)
    .slice(0, 7)
    .map((stock) => stock.price as number);

  if (values.length < 2) {
    return (
      <div className="card trend-card">
        <div className="card-heading">
          <div>
            <h3>Market Trend</h3>
            <p>Recent stock movement</p>
          </div>
        </div>

        <div className="empty">
          <TrendingUp size={25} />
          <p>Not enough price data for a trend.</p>
        </div>
      </div>
    );
  }

  const max = Math.max(...values);
  const min = Math.min(...values);

  const points = values
    .map((value, index) => {
      const x =
        (index / (values.length - 1)) * 100;

      const y =
        max === min
          ? 50
          : 90 -
            ((value - min) / (max - min)) *
              70;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="card trend-card">
      <div className="card-heading">
        <div>
          <h3>Market Trend</h3>
          <p>Recent stock movement</p>
        </div>

        <TrendingUp size={20} />
      </div>

      <svg
        className="trend-chart"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-item ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

function MarketCard({
  title,
  value,
  change,
  positive,
}: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="market-card">
      <span>{title}</span>

      <strong>{value}</strong>

      <b className={positive ? "up" : "down"}>
        {change}
      </b>
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="summary-card">
      <Wallet size={20} />

      <span>{title}</span>

      <strong>{value}</strong>
    </div>
  );
}

function StatItem({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="stat-item">
      <span>{label}</span>
      <strong className={valueClass}>{value}</strong>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getClose(row: HistoryRow) {
  return Number(
    row.close_price ??
      row.close ??
      0
  );
}

function getOpen(row: HistoryRow) {
  return Number(
    row.open_price ??
      row.open ??
      0
  );
}

function getHigh(row: HistoryRow) {
  return Number(
    row.high_price ??
      row.high ??
      0
  );
}

function getLow(row: HistoryRow) {
  return Number(
    row.low_price ??
      row.low ??
      0
  );
}

function getVolume(row: HistoryRow) {
  return Number(row.volume ?? 0);
}

function getDate(row: HistoryRow) {
  return (
    row.date ||
    row.timestamp ||
    ""
  );
}

function formatPrice(value?: number) {
  if (
    value === undefined ||
    !Number.isFinite(value) ||
    value === 0
  ) {
    return "--";
  }

  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatVolume(value?: number) {
  if (
    value === undefined ||
    !Number.isFinite(value) ||
    value === 0
  ) {
    return "--";
  }

  if (value >= 10000000) {
    return `${(value / 10000000).toFixed(2)}Cr`;
  }

  if (value >= 100000) {
    return `${(value / 100000).toFixed(2)}L`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }

  return value.toLocaleString("en-IN");
}

function formatDate(value: string) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default App;