from decimal import Decimal
from typing import Optional

import pandas as pd


def calculate_return(
    history: pd.DataFrame,
    days: int,
) -> Optional[Decimal]:

    if len(history) <= days:
        return None

    price_column = (
        "Adj Close"
        if "Adj Close" in history.columns
        else "Close"
    )

    prices = history[price_column]

    current = prices.iloc[-1]
    previous = prices.iloc[-(days + 1)]

    if pd.isna(current) or pd.isna(previous):
        return None

    if previous == 0:
        return None

    return Decimal(
        str((current - previous) / previous)
    )


def calculate_cagr(
    start_price: float,
    end_price: float,
    years: int,
) -> Optional[Decimal]:

    if (
        start_price <= 0
        or end_price <= 0
        or years <= 0
    ):
        return None

    cagr = (
        (end_price / start_price)
        ** (1 / years)
    ) - 1

    return Decimal(str(cagr))