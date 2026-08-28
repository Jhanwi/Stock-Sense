import pandas as pd


def transform_history(data: pd.DataFrame) -> pd.DataFrame:

    result = data.copy()

    if isinstance(result.columns, pd.MultiIndex):
        result.columns = [
            column[0] for column in result.columns
        ]

    result.index = pd.to_datetime(result.index)

    result = result.sort_index()

    return result