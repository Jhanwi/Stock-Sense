from etl.ingestion.yfinance_client import YFinanceClient
from etl.processing.validator import validate_history
from etl.processing.transformer import transform_history
from etl.processing.returns import calculate_return

from etl.database.repository import (
    create_tables,
    create_ingestion_job,
    save_stock,
    save_historical_prices,
    complete_ingestion_job,
    fail_ingestion_job,
)


def run(ticker):
    create_tables()

    job_id = create_ingestion_job(ticker)

    try:
        print(f"Fetching data for {ticker}...")

        client = YFinanceClient()

        history = client.fetch_history(
            ticker=ticker,
            period="max",
            interval="1d",
        )

        print(f"Downloaded {len(history)} records.")

        history = validate_history(history)
        history = transform_history(history)

        print("Validation successful.")

        stock_id = save_stock(ticker)

        records_saved = save_historical_prices(
            stock_id,
            history,
        )

        complete_ingestion_job(
            job_id,
            records_saved,
        )

        print(
            f"Saved {records_saved} records "
            "to PostgreSQL."
        )

        periods = {
            "1D": 1,
            "5D": 5,
            "1M": 21,
            "3M": 63,
            "6M": 126,
            "1Y": 252,
        }

        print("\nReturns:")

        for name, days in periods.items():
            result = calculate_return(
                history,
                days,
            )

            if result is not None:
                print(
                    f"{name}: "
                    f"{result * 100:.2f}%"
                )
            else:
                print(f"{name}: N/A")

    except Exception as error:
        fail_ingestion_job(
            job_id,
            str(error),
        )

        print(f"ETL failed: {error}")

        raise


if __name__ == "__main__":
    run("RELIANCE.NS")