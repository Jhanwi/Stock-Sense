import pandas as pd


REQUIRED_COLUMNS = {
    "Open",
    "High",
    "Low",
    "Close",
    "Volume",
}


def validate_history(data: pd.DataFrame) -> pd.DataFrame:

    if data.empty:
        raise ValueError("Historical data is empty")

    missing = REQUIRED_COLUMNS - set(data.columns)

    if missing:
        raise ValueError(
            f"Missing columns: {sorted(missing)}"
        )

    result = data.copy()

    result = result.dropna(subset=["Close"])

    result = result[
        ~result.index.duplicated(keep="last")
    ]

    if result.empty:
        raise ValueError(
            "No valid records after validation"
        )

    return result