from typing import Any


def normalize_fundamentals(
    info: dict[str, Any],
) -> dict[str, Any]:

    return {
        "company_name": (
            info.get("longName")
            or info.get("shortName")
        ),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "market_cap": info.get("marketCap"),
        "eps": info.get("trailingEps"),
        "dividend_yield": info.get("dividendYield"),
        "pe": info.get("trailingPE"),
        "pb": info.get("priceToBook"),
    }