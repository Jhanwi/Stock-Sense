import pandas as pd
import yfinance as yf


class YFinanceClient:
    """Client responsible for retrieving market data."""

    def fetch_history(
        self,
        ticker: str,
        period: str = "max",
        interval: str = "1d",
    ) -> pd.DataFrame:

        data = yf.download(
            ticker,
            period=period,
            interval=interval,
            auto_adjust=False,
            progress=False,
        )

        if data.empty:
            raise ValueError(
                f"No historical data found for {ticker}"
            )

        # yfinance may return MultiIndex columns.
        # Convert them to normal column names.
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = data.columns.get_level_values(0)

        return data