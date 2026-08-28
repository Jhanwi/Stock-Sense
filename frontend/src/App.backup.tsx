import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

type Stock = {
  id: number;
  symbol: string;
  company_name: string | null;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
};

type PricePoint = {
  trading_date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
};

type WatchlistItem = {
  symbol: string;
  company_name: string | null;
  created_at: string;
};

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE.NS");
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Test1234");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadStocks();
  }, []);

  async function loadStocks() {
    try {
      const response = await fetch(`${API_URL}/api/stocks`);
      const data = await response.json();
      setStocks(data);
    } catch {
      setMessage("Could not connect to backend.");
    }
  }

  async function login() {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      setToken(data.token);
      setMessage("Logged in successfully.");

      loadWatchlist(data.token);
    } catch {
      setMessage("Backend is not running.");
    }
  }

  async function loadHistory(symbol: string) {
    setSelectedSymbol(symbol);

    try {
      const response = await fetch(
        `${API_URL}/api/stocks/${encodeURIComponent(symbol)}/history`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not load history.");
        return;
      }

      setHistory(data);
    } catch {
      setMessage("Could not load stock history.");
    }
  }

  async function loadWatchlist(authToken: string = token) {
    if (!authToken) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/watchlist`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setWatchlist(data);
      }
    } catch {
      setMessage("Could not load watchlist.");
    }
  }

  async function addToWatchlist() {
    if (!token) {
      setMessage("Login first to use the watchlist.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/watchlist/${encodeURIComponent(selectedSymbol)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      setMessage(
        data.added
          ? `${selectedSymbol} added to watchlist.`
          : "Stock is already in your watchlist."
      );

      loadWatchlist();
    } catch {
      setMessage("Could not update watchlist.");
    }
  }

  async function removeFromWatchlist(symbol: string) {
    try {
      await fetch(
        `${API_URL}/api/watchlist/${encodeURIComponent(symbol)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      loadWatchlist();
    } catch {
      setMessage("Could not remove stock.");
    }
  }

  const latestPrice =
    history.length > 0
      ? history[history.length - 1]
      : null;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Stock Sense</h1>
          <p>Market data and portfolio dashboard</p>
        </div>

        <div className="login-box">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
          />

          <button onClick={login}>Login</button>
        </div>
      </header>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      <main className="dashboard">
        <section className="card stock-selector">
          <h2>Stocks</h2>

          <select
            value={selectedSymbol}
            onChange={(event) =>
              loadHistory(event.target.value)
            }
          >
            {stocks.map((stock) => (
              <option
                key={stock.id}
                value={stock.symbol}
              >
                {stock.symbol}
              </option>
            ))}
          </select>

          <button
            className="watch-button"
            onClick={addToWatchlist}
          >
            Add to Watchlist
          </button>
        </section>

        <section className="price-grid">
          <div className="stat-card">
            <span>Latest Close</span>
            <strong>
              {latestPrice
                ? `₹${Number(
                    latestPrice.close_price
                  ).toFixed(2)}`
                : "--"}
            </strong>
          </div>

          <div className="stat-card">
            <span>Day High</span>
            <strong>
              {latestPrice
                ? `₹${Number(
                    latestPrice.high_price
                  ).toFixed(2)}`
                : "--"}
            </strong>
          </div>

          <div className="stat-card">
            <span>Day Low</span>
            <strong>
              {latestPrice
                ? `₹${Number(
                    latestPrice.low_price
                  ).toFixed(2)}`
                : "--"}
            </strong>
          </div>

          <div className="stat-card">
            <span>Volume</span>
            <strong>
              {latestPrice
                ? Number(
                    latestPrice.volume
                  ).toLocaleString()
                : "--"}
            </strong>
          </div>
        </section>

        <section className="card chart-card">
          <div className="section-heading">
            <div>
              <h2>{selectedSymbol}</h2>
              <p>Historical closing prices</p>
            </div>

            <button
              onClick={() =>
                loadHistory(selectedSymbol)
              }
            >
              Load History
            </button>
          </div>

          {history.length > 0 ? (
            <div className="chart">
              {history
                .slice(-30)
                .map((point, _index, array) => {
                  const prices = array.map(
                    (item) =>
                      Number(item.close_price)
                  );

                  const min = Math.min(...prices);
                  const max = Math.max(...prices);

                  const range = max - min || 1;

                  const height =
                    ((Number(
                      point.close_price
                    ) -
                      min) /
                      range) *
                      80 +
                    10;

                  return (
                    <div
                      className="bar-wrapper"
                      key={point.trading_date}
                      title={`${point.trading_date}: ₹${Number(
                        point.close_price
                      ).toFixed(2)}`}
                    >
                      <div
                        className="bar"
                        style={{
                          height: `${height}%`,
                        }}
                      />
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="empty">
              Select a stock and load its history.
            </div>
          )}
        </section>

        <section className="card watchlist-card">
          <div className="section-heading">
            <div>
              <h2>My Watchlist</h2>
              <p>
                Your saved stocks
              </p>
            </div>

            <button
              onClick={() => loadWatchlist()}
            >
              Refresh
            </button>
          </div>

          {watchlist.length === 0 ? (
            <div className="empty">
              No stocks in your watchlist.
            </div>
          ) : (
            <div className="watchlist">
              {watchlist.map((item) => (
                <div
                  className="watch-item"
                  key={item.symbol}
                >
                  <span>{item.symbol}</span>

                  <button
                    onClick={() =>
                      removeFromWatchlist(
                        item.symbol
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;