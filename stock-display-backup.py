from __future__ import annotations

import argparse
import logging
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, getcontext, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple

import math
import sys

import pandas as pd
import yfinance as yf
from dateutil.relativedelta import relativedelta
from rich.console import Console
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

# Set Decimal precision for financial calculations
getcontext().prec = 28

# Logging and console
LOG = logging.getLogger("stock_snapshot")
LOG.setLevel(logging.INFO)
LOG.addHandler(logging.StreamHandler(sys.stderr))

CONSOLE = Console(force_terminal=True, color_system="truecolor", width=140)

# Yahoo suffixes for NSE and BSE
NSE_SUFFIX = ".NS"
BSE_SUFFIX = ".BO"

# Styling constants
TITLE_STYLE = "bold magenta"
SECTION_RULE_STYLE = "bright_magenta"
LABEL_STYLE = "bold white"
POS_STYLE = "bold green"
NEG_STYLE = "bold red"
DIM_STYLE = "dim"
LOW_STYLE = "bold red"
HIGH_STYLE = "bold green"
BAR_BG_STYLE = "grey37"
MARKER_STYLE = "bold white"

DAY_BAR_WIDTH = 36
WK_BAR_WIDTH = 44


def _indian_commas(n: int) -> str:
    s = str(int(n))
    if len(s) <= 3:
        return s
    last3 = s[-3:]
    rest = s[:-3]
    parts: List[str] = []
    while len(rest) > 2:
        parts.append(rest[-2:])
        rest = rest[:-2]
    if rest:
        parts.append(rest)
    parts.reverse()
    return ",".join(parts) + "," + last3


def fmt_currency_indian(n: Optional[float]) -> str:
    if n is None or (isinstance(n, float) and (math.isnan(n) or math.isinf(n))):
        return "-"
    a = float(n)
    sign = "-" if a < 0 else ""
    a = abs(a)
    if a >= 1e7:
        return f"{sign}₹{a/1e7:,.2f} Cr"
    if a >= 1e5:
        return f"{sign}₹{a/1e5:,.2f} Lakh"
    return f"{sign}₹{a:,.2f}"


def fmt_shares_lakh(raw: Optional[float]) -> str:
    if raw is None:
        return "-"
    try:
        v = float(raw)
    except Exception:
        return str(raw)
    if v <= 0:
        return "-"
    lakhs = v / 1e5
    if lakhs >= 1000:
        return f"{_indian_commas(int(round(lakhs)))} Lakh"
    return f"{lakhs:,.1f} Lakh"


def signed_percentage_from_frac(frac: Optional[float]) -> str:
    if frac is None or not isinstance(frac, (int, float)):
        return ""
    return f"{frac*100:+.2f}%"


def signed_rupee(change: Optional[float]) -> str:
    if change is None:
        return ""
    sign = "-" if change < 0 else "+"
    return f"{sign}₹{abs(change):,.2f}"


def rupee_and_pct_text(delta_rupee: Optional[float], delta_frac: Optional[float]) -> Text:
    if delta_rupee is None and delta_frac is None:
        return Text("-", style=DIM_STYLE)
    if delta_rupee is not None:
        positive = delta_rupee >= 0
    else:
        positive = (delta_frac or 0) >= 0
    arrow = "▲" if positive else "▼"
    style = POS_STYLE if positive else NEG_STYLE
    rupee = signed_rupee(delta_rupee) if delta_rupee is not None else ""
    pct = f"({signed_percentage_from_frac(delta_frac)})" if delta_frac is not None else ""
    pieces = " ".join(p for p in (arrow, rupee, pct) if p)
    return Text(pieces, style=style)


def pct_only_text(frac: Optional[float]) -> Text:
    if frac is None:
        return Text("-", style=DIM_STYLE)
    positive = frac >= 0
    style = POS_STYLE if positive else NEG_STYLE
    arrow = "▲" if positive else "▼"
    return Text(f"{arrow} {signed_percentage_from_frac(frac)}", style=style)


@dataclass(frozen=True)
class Snapshot:
    company_name: str
    exchange: str
    as_of: Optional[datetime]
    ltp: Optional[float]
    open_price: Optional[float]
    day_high: Optional[float]
    day_low: Optional[float]
    wk52_high: Optional[float]
    wk52_low: Optional[float]
    traded_volume: Optional[int]
    traded_value: Optional[float]
    shares_outstanding_raw: Optional[int]
    float_shares_raw: Optional[int]
    total_market_cap: Optional[float]
    free_float_market_cap: Optional[float]
    sector: Optional[str]
    industry: Optional[str]
    eps_ttm: Optional[float]
    dividend_yield: Optional[float]
    pe_ttm: Optional[float]
    pb: Optional[float]


def _to_float(val: Any) -> Optional[float]:
    try:
        return float(val) if val is not None else None
    except Exception:
        return None


def _to_int_from_info(info: Dict[str, Any], keys: List[str]) -> Optional[int]:
    for k in keys:
        if k in info and info.get(k) is not None:
            try:
                return int(info.get(k))
            except Exception:
                continue
    return None


class StockAnalyzer:
    def __init__(self, exchange: str, ticker: str, console: Console = CONSOLE) -> None:
        exch = (exchange or "").strip().upper()
        if exch not in ("NSE", "BSE"):
            raise ValueError("Exchange must be 'NSE' or 'BSE'")
        symbol = (ticker or "").strip().upper()
        if not symbol:
            raise ValueError("Ticker must be provided")
        self.exchange = exch
        self.raw_ticker = symbol
        self.symbol = symbol if "." in symbol else symbol + (NSE_SUFFIX if exch == "NSE" else BSE_SUFFIX)
        self.ticker_obj: Optional[yf.Ticker] = None
        self.info: Dict[str, Any] = {}
        self.history: pd.DataFrame = pd.DataFrame()
        self.console = console

    def fetch(self, history_period: str = "max", history_interval: str = "1d") -> bool:
        self.console.log(f"Fetching {self.symbol} (period={history_period}, interval={history_interval})")
        try:
            self.ticker_obj = yf.Ticker(self.symbol)
        except Exception:
            LOG.exception("Error creating Ticker object")
            return False

        try:
            self.info = self.ticker_obj.info or {}
        except Exception:
            self.info = {}

        try:
            hist = self.ticker_obj.history(period=history_period, interval=history_interval, auto_adjust=False)
            if hist is None or hist.empty:
                LOG.warning("No history returned for %s", self.symbol)
                return False
            hist.index = pd.to_datetime(hist.index).tz_localize(None)
            self.history = hist
        except Exception:
            LOG.exception("Error fetching history")
            return False

        return True

    def _last_row_price(self, row: Optional[pd.Series]) -> Optional[float]:
        if row is None:
            return None
        if "Adj Close" in self.history.columns and not pd.isna(row.get("Adj Close")):
            return float(row.get("Adj Close"))
        if not pd.isna(row.get("Close")):
            return float(row.get("Close"))
        return None

    def build_snapshot(self) -> Snapshot:
        info = self.info or {}
        hist = self.history

        company_name = info.get("longName") or info.get("shortName") or self.raw_ticker
        as_of = hist.index[-1] if not hist.empty else None

        last_row = hist.iloc[-1] if not hist.empty else None
        last_price = self._last_row_price(last_row)

        ltp = None
        for fld in ("regularMarketPrice", "currentPrice", "last_price", "previousClose"):
            if fld in info and info.get(fld) is not None:
                try:
                    ltp = float(info.get(fld))
                    break
                except Exception:
                    ltp = None
        if ltp is None:
            ltp = last_price

        open_price = None
        for open_key in ("open", "regularMarketOpen"):
            if open_key in info and info.get(open_key) is not None:
                try:
                    open_price = float(info.get(open_key))
                    break
                except Exception:
                    open_price = None
        if open_price is None and last_row is not None and "Open" in hist.columns and not pd.isna(last_row.get("Open")):
            try:
                open_price = float(last_row.get("Open"))
            except Exception:
                open_price = None

        day_high = _to_float(info.get("dayHigh"))
        day_low = _to_float(info.get("dayLow"))
        if last_row is not None:
            if day_high is None and "High" in hist.columns and not pd.isna(last_row.get("High")):
                day_high = float(last_row.get("High"))
            if day_low is None and "Low" in hist.columns and not pd.isna(last_row.get("Low")):
                day_low = float(last_row.get("Low"))

        wk52_high = _to_float(info.get("fiftyTwoWeekHigh") or info.get("52WeekHigh"))
        wk52_low = _to_float(info.get("fiftyTwoWeekLow") or info.get("52WeekLow"))
        if (wk52_high is None or wk52_low is None) and not hist.empty:
            last_dt = hist.index[-1]
            start_52 = last_dt - relativedelta(weeks=52)
            window = hist.loc[hist.index >= start_52]
            if len(window) < 10:
                window = hist
            if "Close" in window.columns and not window["Close"].dropna().empty:
                wk52_high = float(window["Close"].max())
                wk52_low = float(window["Close"].min())

        traded_volume = None
        traded_value = None
        if last_row is not None:
            if "Volume" in hist.columns and not pd.isna(last_row.get("Volume")):
                try:
                    traded_volume = int(last_row.get("Volume"))
                except Exception:
                    traded_volume = None
            if traded_volume is not None and last_price is not None:
                traded_value = traded_volume * last_price

        shares_out_raw = _to_int_from_info(info, ["sharesOutstanding", "shares_outstanding", "shareCount"])
        float_raw = _to_int_from_info(info, ["floatShares", "float_share_count", "float_share", "float"])
        total_market_cap = _to_float(info.get("marketCap"))
        if total_market_cap is None and shares_out_raw is not None and last_price is not None:
            total_market_cap = shares_out_raw * last_price
        free_float_market_cap = _to_float(info.get("floatMarketCap"))
        if free_float_market_cap is None and float_raw is not None and last_price is not None:
            free_float_market_cap = float_raw * last_price

        sector = info.get("sector")
        industry = info.get("industry")
        eps_ttm = _to_float(info.get("trailingEps") or info.get("epsTrailingTtm"))
        dividend_yield = _to_float(info.get("dividendYield"))
        pe_ttm = _to_float(info.get("trailingPE") or info.get("forwardPE") or info.get("priceToEarningsTrailing"))
        pb = _to_float(info.get("priceToBook") or info.get("pb"))

        return Snapshot(
            company_name=company_name,
            exchange=self.exchange,
            as_of=as_of,
            ltp=ltp,
            open_price=open_price,
            day_high=day_high,
            day_low=day_low,
            wk52_high=wk52_high,
            wk52_low=wk52_low,
            traded_volume=traded_volume,
            traded_value=traded_value,
            shares_outstanding_raw=shares_out_raw,
            float_shares_raw=float_raw,
            total_market_cap=total_market_cap,
            free_float_market_cap=free_float_market_cap,
            sector=sector,
            industry=industry,
            eps_ttm=eps_ttm,
            dividend_yield=dividend_yield,
            pe_ttm=pe_ttm,
            pb=pb,
        )

    def _price_on_or_before(self, target_date: pd.Timestamp) -> Optional[float]:
        if self.history.empty:
            return None
        target = pd.to_datetime(target_date)
        mask = self.history.index <= target
        if not mask.any():
            return None
        row = self.history.loc[mask].iloc[-1]
        if "Adj Close" in self.history.columns and not pd.isna(row.get("Adj Close")):
            return float(row.get("Adj Close"))
        if not pd.isna(row.get("Close")):
            return float(row.get("Close"))
        return None

    def _price_n_trading_days_ago(self, n: int) -> Optional[float]:
        if self.history.empty:
            return None
        idx = len(self.history) - (n + 1)
        if idx < 0:
            return None
        row = self.history.iloc[idx]
        if "Adj Close" in self.history.columns and not pd.isna(row.get("Adj Close")):
            return float(row["Adj Close"])
        if not pd.isna(row.get("Close")):
            return float(row.get("Close"))
        return None

    def compute_returns_with_reasons(self) -> Dict[str, Dict[str, Any]]:
        periods = ["1D", "5D", "1M", "2M", "3M", "6M", "9M", "YTD", "1Y", "2Y", "3Y", "4Y", "5Y", "10Y", "Overall"]
        res: Dict[str, Dict[str, Any]] = {p: {"value_frac": None, "abs_change": None, "reason": None} for p in periods}

        hist = self.history
        if hist.empty:
            for p in res:
                res[p]["reason"] = "no history"
            return res

        last_date = hist.index[-1]
        last_price_f = self._price_on_or_before(last_date)
        if last_price_f is None or last_price_f == 0:
            for p in res:
                res[p]["reason"] = "invalid last price"
            return res

        try:
            last_price = Decimal(str(last_price_f))
        except (InvalidOperation, TypeError):
            for p in res:
                res[p]["reason"] = "invalid last price"
            return res

        first_date = hist.index[0]
        n_rows = len(hist)

        trading_days_map = {"1D": 1, "5D": 5}
        for label, days in trading_days_map.items():
            if n_rows < (days + 1):
                res[label]["reason"] = f"only {n_rows} trading days"
                continue
            start_f = self._price_n_trading_days_ago(days)
            if start_f is None or start_f == 0:
                res[label]["reason"] = "start price missing"
                continue
            start = Decimal(str(start_f))
            abs_change = last_price - start
            try:
                frac = abs_change / start
            except (InvalidOperation, ZeroDivisionError):
                res[label]["reason"] = "division error"
                continue
            res[label]["abs_change"] = abs_change
            res[label]["value_frac"] = frac
            res[label]["reason"] = "OK"

        calendar_map = {
            "1M": relativedelta(months=1),
            "2M": relativedelta(months=2),
            "3M": relativedelta(months=3),
            "6M": relativedelta(months=6),
            "9M": relativedelta(months=9),
            "1Y": relativedelta(years=1),
            "2Y": relativedelta(years=2),
            "3Y": relativedelta(years=3),
            "4Y": relativedelta(years=4),
            "5Y": relativedelta(years=5),
            "10Y": relativedelta(years=10),
        }
        for label, delta in calendar_map.items():
            target = last_date - delta
            if first_date > target:
                res[label]["reason"] = f"insufficient history (first {first_date.date()})"
                continue
            start_f = self._price_on_or_before(target)
            if start_f is None or start_f == 0:
                res[label]["reason"] = "start price missing"
                continue
            start = Decimal(str(start_f))
            abs_change = last_price - start
            try:
                frac = abs_change / start
            except (InvalidOperation, ZeroDivisionError):
                res[label]["reason"] = "division error"
                continue
            res[label]["abs_change"] = abs_change
            res[label]["value_frac"] = frac
            res[label]["reason"] = "OK"

        try:
            year_start = pd.to_datetime(date(last_date.year, 1, 1))
            mask = hist.index >= year_start
            if not mask.any():
                res["YTD"]["reason"] = f"no trading days after {year_start.date()}"
            else:
                row = hist.loc[mask].iloc[0]
                start_f = float(row.get("Adj Close") if "Adj Close" in hist.columns else row.get("Close"))
                if start_f == 0:
                    res["YTD"]["reason"] = "invalid YTD start price"
                else:
                    start = Decimal(str(start_f))
                    abs_change = last_price - start
                    res["YTD"]["abs_change"] = abs_change
                    try:
                        res["YTD"]["value_frac"] = abs_change / start
                        res["YTD"]["reason"] = "OK"
                    except (InvalidOperation, ZeroDivisionError):
                        res["YTD"]["reason"] = "division error"
        except Exception:
            res["YTD"]["reason"] = "error computing YTD"

        start_f = self._price_on_or_before(first_date)
        if start_f is None or start_f == 0:
            res["Overall"]["reason"] = "first price missing"
        else:
            start = Decimal(str(start_f))
            abs_change = last_price - start
            res["Overall"]["abs_change"] = abs_change
            try:
                res["Overall"]["value_frac"] = abs_change / start
                res["Overall"]["reason"] = "OK"
            except (InvalidOperation, ZeroDivisionError):
                res["Overall"]["reason"] = "division error"

        return res

    def compute_cagrs_with_reasons(self) -> Dict[str, Dict[str, Any]]:
        labels = ["2Y", "3Y", "4Y", "5Y", "10Y", "Overall"]
        res: Dict[str, Dict[str, Any]] = {p: {"value": None, "reason": None} for p in labels}

        hist = self.history
        if hist.empty:
            for p in res:
                res[p]["reason"] = "no history"
            return res

        first = hist.index[0]
        last = hist.index[-1]
        last_price_f = self._price_on_or_before(last)
        if last_price_f is None or last_price_f <= 0:
            for p in res:
                res[p]["reason"] = "invalid last price"
            return res

        last_price = Decimal(str(last_price_f))
        total_years = Decimal((last - first).days) / Decimal("365.25")

        spans = {"2Y": 2, "3Y": 3, "4Y": 4, "5Y": 5, "10Y": 10}
        for lab, yrs in spans.items():
            if total_years < Decimal(yrs):
                res[lab]["reason"] = f"insufficient history (<{yrs}y)"
                continue
            target = last - relativedelta(years=yrs)
            start_f = self._price_on_or_before(target)
            if start_f is None or start_f <= 0:
                res[lab]["reason"] = "start price missing"
                continue
            start = Decimal(str(start_f))
            try:
                ratio = last_price / start
            except (InvalidOperation, ZeroDivisionError):
                res[lab]["reason"] = "division error"
                continue
            try:
                ratio_f = float(ratio)
                cagr_f = math.pow(ratio_f, 1.0 / yrs) - 1.0
                res[lab]["value"] = Decimal(str(cagr_f))
                res[lab]["reason"] = "OK"
            except Exception as exc:
                res[lab]["reason"] = f"error {exc}"

        if total_years >= Decimal("1.0"):
            start_f = self._price_on_or_before(first)
            if start_f is None or start_f <= 0:
                res["Overall"]["reason"] = "start price missing"
            else:
                start = Decimal(str(start_f))
                try:
                    ratio = last_price / start
                    ratio_f = float(ratio)
                    total_years_f = float(total_years)
                    cagr_f = math.pow(ratio_f, 1.0 / total_years_f) - 1.0
                    res["Overall"]["value"] = Decimal(str(cagr_f))
                    res["Overall"]["reason"] = "OK"
                except Exception as exc:
                    res["Overall"]["reason"] = f"error {exc}"
        else:
            res["Overall"]["reason"] = "requires >=1 year"

        return res

    def _range_block_elements(self, low: Optional[float], high: Optional[float], current: Optional[float],
                              width: int) -> Tuple[Optional[Text], Optional[Text], Optional[str], Optional[str]]:
        if low is None or high is None or current is None or high <= low:
            return None, None, None, None

        pos = max(0.0, min(1.0, (current - low) / (high - low)))
        idx = int(round(pos * (width - 1)))

        bar = Text()
        for i in range(width):
            if i == idx:
                bar.append("●", style=MARKER_STYLE)
            else:
                bar.append("─", style=BAR_BG_STYLE)

        low_s = fmt_currency_indian(low)
        high_s = fmt_currency_indian(high)

        try:
            pct_low = (current - low) / low * 100.0
            pct_high = (high - current) / high * 100.0
        except Exception:
            pct_low = pos * 100.0
            pct_high = (1.0 - pos) * 100.0

        pct_text = Text()
        pct_text.append("(")
        pct_text.append(f"↑ {abs(pct_low):.1f}% from low", style=POS_STYLE)
        pct_text.append("  |  ")
        pct_text.append(f"↓ {abs(pct_high):.1f}% from high", style=NEG_STYLE)
        pct_text.append(")")

        return bar, pct_text, low_s, high_s

    def _adaptive_bar_width(self, desired: int) -> int:
        total = max(40, self.console.width)
        max_allowed = max(8, int(total * 0.45))
        return min(desired, max_allowed)

    def _print_kv_section(self, title: str, rows: List[Tuple[str, Any]]) -> None:
        self.console.print(Rule(title, style=SECTION_RULE_STYLE))
        tbl = Table.grid(padding=(0, 2))
        tbl.add_column(justify="left", ratio=2)
        tbl.add_column(justify="right", ratio=3)
        for label, val in rows:
            if isinstance(val, Text):
                tbl.add_row(Text(label, style=LABEL_STYLE), val)
            else:
                tbl.add_row(Text(label, style=LABEL_STYLE), Text(str(val), style="white"))
        self.console.print(tbl)
        self.console.print()

    def render_price_information(self, snap: Snapshot) -> None:
        """Render PRICE INFORMATION with shared bar lengths and padded labels for perfect alignment."""
        prev_close_f = self._price_n_trading_days_ago(1)
        rupee_change = None
        pct_change = None
        if prev_close_f is not None and snap.ltp is not None:
            try:
                rupee_change = snap.ltp - prev_close_f
                pct_change = (snap.ltp - prev_close_f) / prev_close_f
            except Exception:
                rupee_change, pct_change = None, None

        ltp_val = Text()
        ltp_val.append(fmt_currency_indian(snap.ltp) + "   ", style="bold white")
        ltp_val.append(rupee_and_pct_text(rupee_change, pct_change))

        open_val_text = Text(fmt_currency_indian(snap.open_price), style="white")

        day_low_s = fmt_currency_indian(snap.day_low)
        day_high_s = fmt_currency_indian(snap.day_high)
        wk52_low_s = fmt_currency_indian(snap.wk52_low)
        wk52_high_s = fmt_currency_indian(snap.wk52_high)

        day_range_str = f"{day_low_s}  —  {day_high_s}"
        wk52_range_str = f"{wk52_low_s}  —  {wk52_high_s}"

        desired_bar = max(DAY_BAR_WIDTH, WK_BAR_WIDTH)
        bar_w = self._adaptive_bar_width(desired_bar)

        left_w = max(len(day_low_s) if day_low_s else 0, len(wk52_low_s) if wk52_low_s else 0)
        right_w = max(len(day_high_s if day_high_s else ""), len(wk52_high_s if wk52_high_s else ""))

        parent = Table.grid(padding=(0, 2))
        parent.add_column(justify="left", ratio=2)
        parent.add_column(justify="right", ratio=3)

        parent.add_row(Text("LTP", style=LABEL_STYLE), ltp_val)
        parent.add_row(Text("Open", style=LABEL_STYLE), open_val_text)
        parent.add_row(Text("Previous Close (1 trading day ago)", style=LABEL_STYLE),
                       Text(fmt_currency_indian(prev_close_f), style="white"))
        parent.add_row(Text("Day High / Low", style=LABEL_STYLE), Text(day_range_str, style="white"))

        if snap.day_low is not None and snap.day_high is not None and snap.ltp is not None:
            bar_text, pct_text, _, _ = self._range_block_elements(snap.day_low, snap.day_high, snap.ltp, width=bar_w)
            if bar_text is not None:
                left_label = day_low_s.rjust(left_w)
                right_label = day_high_s.rjust(right_w)
                nested_day = Table.grid(padding=(0, 1))
                nested_day.add_column(justify="left", ratio=left_w)
                nested_day.add_column(justify="center", ratio=bar_w)
                nested_day.add_column(justify="right", ratio=right_w)
                nested_day.add_row(Text(left_label, style=LOW_STYLE), bar_text, Text(right_label, style=HIGH_STYLE))
                nested_day.add_row(Text(""), pct_text, Text(""))
                parent.add_row(Text(""), nested_day)
        else:
            parent.add_row(Text(""), Text(""))

        parent.add_row(Text("52W High / Low", style=LABEL_STYLE), Text(wk52_range_str, style="white"))

        if snap.wk52_low is not None and snap.wk52_high is not None and snap.ltp is not None:
            bar_text, pct_text, _, _ = self._range_block_elements(snap.wk52_low, snap.wk52_high, snap.ltp, width=bar_w)
            if bar_text is not None:
                left_label = wk52_low_s.rjust(left_w)
                right_label = wk52_high_s.rjust(right_w)
                nested_52 = Table.grid(padding=(0, 1))
                nested_52.add_column(justify="left", ratio=left_w)
                nested_52.add_column(justify="center", ratio=bar_w)
                nested_52.add_column(justify="right", ratio=right_w)
                nested_52.add_row(Text(left_label, style=LOW_STYLE), bar_text, Text(right_label, style=HIGH_STYLE))
                nested_52.add_row(Text(""), pct_text, Text(""))
                parent.add_row(Text(""), nested_52)
        else:
            parent.add_row(Text(""), Text(""))

        self.console.print(Rule("PRICE INFORMATION", style=SECTION_RULE_STYLE))
        self.console.print(parent)
        self.console.print()

    def render(self, show_missing_reasons: bool = False) -> None:
        snap = self.build_snapshot()
        returns = self.compute_returns_with_reasons()
        cagrs = self.compute_cagrs_with_reasons()

        title = f"{snap.company_name} — {snap.exchange} — Stock Snapshot"
        if snap.as_of:
            title += f"  (As of {snap.as_of.strftime('%d-%m-%Y')})"

        self.console.print(Rule(style="cyan"))
        self.console.print(Text(title, style=TITLE_STYLE), justify="center")
        self.console.print(Rule(style="cyan"))
        self.console.print()

        self._print_kv_section("SECTOR & INDUSTRY", [
            ("Sector", snap.sector or "-"),
            ("Industry", snap.industry or "-"),
        ])

        self.render_price_information(snap)

        self._print_kv_section("TRADING INFORMATION", [
            ("Traded Volume", (fmt_shares_lakh(snap.traded_volume) + " shares") if snap.traded_volume else "-"),
            ("Traded Value", fmt_currency_indian(snap.traded_value)),
        ])

        self._print_kv_section("SHARES & MARKET CAP", [
            ("Shares Outstanding", fmt_shares_lakh(snap.shares_outstanding_raw)),
            ("Total Market Cap", fmt_currency_indian(snap.total_market_cap)),
            ("Floating Stocks", fmt_shares_lakh(snap.float_shares_raw)),
            ("Free Float Market Cap", fmt_currency_indian(snap.free_float_market_cap)),
        ])

        dy_text = f"{snap.dividend_yield:.2f}%" if snap.dividend_yield is not None else "-"
        self._print_kv_section("KEY FUNDAMENTALS", [
            ("EPS (TTM)", fmt_currency_indian(snap.eps_ttm) if snap.eps_ttm is not None else "-"),
            ("Dividend Yield", dy_text),
            ("P/E Ratio", f"{snap.pe_ttm:.2f}" if snap.pe_ttm is not None else "-"),
            ("P/B Ratio", f"{snap.pb:.2f}" if snap.pb is not None else "-"),
        ])

        self.console.print(Rule("RETURNS", style=SECTION_RULE_STYLE))
        ret_table = Table.grid(expand=True)
        ret_table.add_column(ratio=1)
        ret_table.add_column(ratio=1)
        ret_table.add_column(ratio=1)
        order = ["1D", "5D", "1M", "2M", "3M", "6M", "9M", "YTD", "1Y", "2Y", "3Y", "4Y", "5Y", "10Y", "Overall"]
        cells: List[Text] = []
        for lab in order:
            info = returns.get(lab, {"value_frac": None, "abs_change": None, "reason": None})
            if info and info.get("reason") == "OK":
                t = Text()
                t.append(f"{lab}: ", style=LABEL_STYLE)
                abs_chg = info.get("abs_change")
                frac = info.get("value_frac")
                abs_chg_f = float(abs_chg) if isinstance(abs_chg, Decimal) else abs_chg
                frac_f = float(frac) if isinstance(frac, Decimal) else frac
                t.append(rupee_and_pct_text(abs_chg_f, frac_f))
            elif show_missing_reasons and info:
                t = Text(f"{lab}: — {info.get('reason')}", style=DIM_STYLE)
            else:
                t = Text(f"{lab}: —", style=DIM_STYLE)
            cells.append(t)
        for i in range(0, len(cells), 3):
            row = cells[i:i + 3]
            while len(row) < 3:
                row.append(Text(""))
            ret_table.add_row(*row)
        self.console.print(ret_table)
        self.console.print()

        self.console.print(Rule("CAGR (annualised)", style=SECTION_RULE_STYLE))
        c_table = Table.grid(expand=True)
        c_table.add_column(ratio=1)
        c_table.add_column(ratio=1)
        c_table.add_column(ratio=1)
        c_order = ["2Y", "3Y", "4Y", "5Y", "10Y", "Overall"]
        crow: List[Text] = []
        for lab in c_order:
            info = cagrs.get(lab, {"value": None, "reason": None})
            if info and info.get("reason") == "OK":
                t = Text()
                t.append(f"{lab}: ", style=LABEL_STYLE)
                val = info.get("value")
                val_f = float(val) if isinstance(val, Decimal) else val
                t.append(pct_only_text(val_f))
            elif show_missing_reasons and info:
                t = Text(f"{lab}: — {info.get('reason')}", style=DIM_STYLE)
            else:
                t = Text(f"{lab}: —", style=DIM_STYLE)
            crow.append(t)
        for i in range(0, len(crow), 3):
            row = crow[i:i + 3]
            while len(row) < 3:
                row.append(Text(""))
            c_table.add_row(*row)
        self.console.print(c_table)
        self.console.print(Rule(style="cyan"))

        self.console.print(Text("Source: ", style=DIM_STYLE) + Text("yfinance / Yahoo Finance", style="white"))
        self.console.print(Text("Notes: ", style=DIM_STYLE) + Text(
            "1D and 5D use actual trading days. Calendar periods use the most recent trading price on or before the target date. "
            "Percentages are rounded to two decimal places. CAGR is computed using the geometric mean formula.",
            style="white"
        ))
        self.console.print()


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Stock Snapshot (display-only; aligned range bars)")
    p.add_argument("--exchange", "-e", choices=["NSE", "BSE"], required=True, help="Exchange: NSE or BSE")
    p.add_argument("--ticker", "-t", required=True, help="Ticker (omit .NS/.BO)")
    p.add_argument("--history-period", default="max", help="yfinance history period (default: max)")
    p.add_argument("--history-interval", default="1d", help="yfinance history interval (default: 1d)")
    p.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    p.add_argument("--show-missing-reasons", action="store_true", help="Show reasons for missing returns/CAGR values")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    if args.verbose:
        LOG.setLevel(logging.DEBUG)

    analyzer = StockAnalyzer(args.exchange, args.ticker, console=CONSOLE)

    with CONSOLE.status(f"Fetching {analyzer.symbol} ...", spinner="dots"):
        ok = analyzer.fetch(history_period=args.history_period, history_interval=args.history_interval)

    if not ok:
        CONSOLE.print(Text(f"❌ Unable to fetch usable data for {analyzer.symbol}.", style="bold yellow"))
        raise SystemExit(1)

    analyzer.render(show_missing_reasons=args.show_missing_reasons)


if __name__ == "__main__":
    main()
