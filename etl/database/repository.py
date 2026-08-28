import os

import psycopg2
from psycopg2.extras import execute_values


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://stock_user:stock_password@localhost:5432/stock_sense",
)


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def create_tables():
    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS stocks (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(20) UNIQUE NOT NULL,
                    company_name VARCHAR(255),
                    sector VARCHAR(100),
                    industry VARCHAR(150),
                    market_cap BIGINT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS historical_prices (
                    id BIGSERIAL PRIMARY KEY,
                    stock_id INTEGER NOT NULL
                        REFERENCES stocks(id)
                        ON DELETE CASCADE,
                    trading_date DATE NOT NULL,
                    open_price NUMERIC(15, 4),
                    high_price NUMERIC(15, 4),
                    low_price NUMERIC(15, 4),
                    close_price NUMERIC(15, 4),
                    volume BIGINT,
                    UNIQUE(stock_id, trading_date)
                )
                """
            )

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS ingestion_jobs (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(20) NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    records_processed INTEGER DEFAULT 0,
                    error_message TEXT,
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP
                )
                """
            )

        connection.commit()

    finally:
        connection.close()


def create_ingestion_job(symbol):
    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO ingestion_jobs (symbol, status)
                VALUES (%s, %s)
                RETURNING id
                """,
                (symbol, "RUNNING"),
            )

            job_id = cursor.fetchone()[0]

        connection.commit()

        return job_id

    finally:
        connection.close()


def save_stock(symbol):
    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO stocks (symbol)
                VALUES (%s)
                ON CONFLICT (symbol)
                DO UPDATE SET symbol = EXCLUDED.symbol
                RETURNING id
                """,
                (symbol,),
            )

            stock_id = cursor.fetchone()[0]

        connection.commit()

        return stock_id

    finally:
        connection.close()


def save_historical_prices(stock_id, history):
    connection = get_connection()

    rows = []

    for date, row in history.iterrows():
        rows.append(
            (
                stock_id,
                date.date(),
                float(row["Open"]),
                float(row["High"]),
                float(row["Low"]),
                float(row["Close"]),
                int(row["Volume"]),
            )
        )

    try:
        with connection.cursor() as cursor:

            execute_values(
                cursor,
                """
                INSERT INTO historical_prices (
                    stock_id,
                    trading_date,
                    open_price,
                    high_price,
                    low_price,
                    close_price,
                    volume
                )
                VALUES %s
                ON CONFLICT (stock_id, trading_date)
                DO UPDATE SET
                    open_price = EXCLUDED.open_price,
                    high_price = EXCLUDED.high_price,
                    low_price = EXCLUDED.low_price,
                    close_price = EXCLUDED.close_price,
                    volume = EXCLUDED.volume
                """,
                rows,
            )

        connection.commit()

        return len(rows)

    finally:
        connection.close()


def complete_ingestion_job(job_id, records_processed):
    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE ingestion_jobs
                SET
                    status = %s,
                    records_processed = %s,
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    "SUCCESS",
                    records_processed,
                    job_id,
                ),
            )

        connection.commit()

    finally:
        connection.close()


def fail_ingestion_job(job_id, error_message):
    connection = get_connection()

    try:
        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE ingestion_jobs
                SET
                    status = %s,
                    error_message = %s,
                    completed_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    "FAILED",
                    error_message,
                    job_id,
                ),
            )

        connection.commit()

    finally:
        connection.close()