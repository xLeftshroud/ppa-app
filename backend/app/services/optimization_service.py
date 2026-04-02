from __future__ import annotations

import logging

from app.models.request_models import SimulateRequest
from app.services.simulation_service import run_simulation

logger = logging.getLogger(__name__)


def optimize_revenue(req: SimulateRequest) -> dict:
    """Scan the demand curve from run_simulation and find price maximizing revenue (price * volume)."""
    resp = run_simulation(req)

    best_price = 0.0
    best_volume = 0.0
    best_revenue = 0.0

    for pt in resp.curve:
        revenue = pt.price_per_litre * pt.predicted_volume_units
        if revenue > best_revenue:
            best_revenue = revenue
            best_price = pt.price_per_litre
            best_volume = pt.predicted_volume_units

    baseline_revenue = None
    if resp.baseline:
        baseline_revenue = round(resp.baseline.price_per_litre * resp.baseline.volume_units, 2)

    return {
        "optimal_price_per_litre": round(best_price, 4),
        "volume_at_optimal": round(best_volume, 2),
        "max_revenue": round(best_revenue, 2),
        "baseline_revenue": baseline_revenue,
        "baseline_price": resp.baseline.price_per_litre if resp.baseline else None,
        "baseline_volume": resp.baseline.volume_units if resp.baseline else None,
        "warnings": resp.warnings,
    }
