from __future__ import annotations

import logging

from app.models.request_models import SimulateRequest
from app.services.revenue_utils import compute_revenue
from app.services.simulation_service import run_simulation

logger = logging.getLogger(__name__)


def optimize_revenue(
    req: SimulateRequest,
    min_price: float | None = None,
    max_price: float | None = None,
) -> dict:
    """Scan the demand curve from run_simulation and find the price maximizing gross sales revenue (volume_units * price_per_item)."""
    resp = run_simulation(req)

    best_price = 0.0
    best_volume = 0.0
    best_raw = 0.0

    for pt in resp.curve:
        if min_price is not None and pt.price_per_litre < min_price:
            continue
        if max_price is not None and pt.price_per_litre > max_price:
            continue
        # argmax is invariant to the constant pack_size*units_per_pkg multiplier, so compare raw
        raw = pt.price_per_litre * pt.predicted_volume_units
        if raw > best_raw:
            best_raw = raw
            best_price = pt.price_per_litre
            best_volume = pt.predicted_volume_units

    best_revenue = compute_revenue(best_price, best_volume, req.pack_size_internal, req.units_per_package_internal) or 0.0

    baseline_revenue = None
    if resp.baseline:
        baseline_revenue = compute_revenue(resp.baseline.price_per_litre, resp.baseline.volume_units, req.pack_size_internal, req.units_per_package_internal)

    return {
        "optimal_price_per_litre": round(best_price, 4),
        "volume_at_optimal": round(best_volume, 2),
        "max_revenue": round(best_revenue, 2),
        "baseline_revenue": baseline_revenue,
        "baseline_price": resp.baseline.price_per_litre if resp.baseline else None,
        "baseline_volume": resp.baseline.volume_units if resp.baseline else None,
        "search_min_price": min_price,
        "search_max_price": max_price,
        "warnings": resp.warnings,
    }
