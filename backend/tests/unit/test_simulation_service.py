"""Unit tests for simulation_service — the core business logic."""
from __future__ import annotations

import pytest

from app.models.request_models import SimulateRequest
from app.services.simulation_service import run_simulation


def _req(dataset_id: str, **overrides) -> SimulateRequest:
    defaults = dict(
        dataset_id=dataset_id,
        product_sku_code=100001,
        customer="L2_TESCO",
        promotion_indicator=0,
        week=20,
        top_brand="FANTA",
        flavor_internal="ORANGE",
        pack_type_internal="CAN",
        pack_size_internal=330,
        units_per_package_internal=8,
        baseline_override_price_per_litre=1.50,
        selected_new_price_per_litre=1.80,
    )
    defaults.update(overrides)
    return SimulateRequest(**defaults)


def test_curve_has_expected_length_and_is_monotonic(dataset_id: str) -> None:
    resp = run_simulation(_req(dataset_id))
    # 0.001 → 10.0 step 0.001 ≈ 10000 points
    assert 9900 < len(resp.curve) <= 10000
    vols = [p.predicted_volume_units for p in resp.curve]
    # Log-log demand ⇒ strictly non-increasing
    assert all(vols[i] >= vols[i + 1] for i in range(len(vols) - 1))


def test_selected_elasticity_close_to_minus_epsilon(dataset_id: str) -> None:
    """DummyDemandModel has constant elasticity ≈ -1.8."""
    resp = run_simulation(_req(dataset_id, selected_new_price_per_litre=1.50))
    assert resp.selected is not None
    # The simulation uses a single-sided +0.001 differential; tolerance ±0.05
    assert resp.selected.elasticity == pytest.approx(-1.8, abs=0.05)


def test_baseline_and_arc_elasticity_computed(dataset_id: str) -> None:
    resp = run_simulation(_req(dataset_id))
    assert resp.baseline is not None
    assert resp.baseline_elasticity is not None
    assert resp.arc_elasticity is not None
    assert resp.arc_elasticity < 0  # price up → volume down


def test_warning_when_baseline_not_found(dataset_id: str) -> None:
    # Unknown SKU means no baseline lookup succeeds
    resp = run_simulation(_req(dataset_id, product_sku_code=999999))
    assert any("No baseline" in w for w in resp.warnings)


def test_selected_price_below_p1_adds_warning(dataset_id: str) -> None:
    resp = run_simulation(
        _req(dataset_id, selected_new_price_per_litre=0.10, baseline_override_price_per_litre=1.50)
    )
    assert any("below training distribution" in w for w in resp.warnings)


def test_model_info_populated_from_metadata(dataset_id: str) -> None:
    resp = run_simulation(_req(dataset_id))
    assert resp.model_info.model_name == "DummyDemandModel"
    assert resp.model_info.model_version == "test"
