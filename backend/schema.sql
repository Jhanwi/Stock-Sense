-- ============================================
-- Stock Sense Database Schema
-- ============================================

-- ============================================
-- USERS
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- STOCKS
-- ============================================

CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    sector VARCHAR(255),
    industry VARCHAR(255),
    market_cap BIGINT
);


-- ============================================
-- HISTORICAL PRICES
-- ============================================

CREATE TABLE IF NOT EXISTS historical_prices (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER NOT NULL,
    trading_date DATE NOT NULL,
    open_price NUMERIC(15, 4),
    high_price NUMERIC(15, 4),
    low_price NUMERIC(15, 4),
    close_price NUMERIC(15, 4),
    volume BIGINT,

    CONSTRAINT fk_historical_stock
        FOREIGN KEY (stock_id)
        REFERENCES stocks(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_stock_trading_date
        UNIQUE (stock_id, trading_date)
);


-- ============================================
-- WATCHLIST
-- ============================================

CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    stock_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_watchlist_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_watchlist_stock
        FOREIGN KEY (stock_id)
        REFERENCES stocks(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_stock
        UNIQUE (user_id, stock_id)
);


-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

CREATE INDEX IF NOT EXISTS idx_stocks_symbol
    ON stocks(symbol);

CREATE INDEX IF NOT EXISTS idx_historical_stock_id
    ON historical_prices(stock_id);

CREATE INDEX IF NOT EXISTS idx_historical_trading_date
    ON historical_prices(trading_date);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id
    ON watchlist(user_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_stock_id
    ON watchlist(stock_id);
