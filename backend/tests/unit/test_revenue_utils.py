from app.services.revenue_utils import compute_revenue


def test_simple_litre_volume():
    assert compute_revenue(1.3771, 100.0) == 137.71


def test_zero_volume_yields_zero():
    assert compute_revenue(2.5, 0.0) == 0.0


def test_rounds_to_two_decimals():
    assert compute_revenue(3.4253, 1.0) == 3.43


def test_scales_linearly():
    a = compute_revenue(2.0, 50.0)
    b = compute_revenue(2.0, 100.0)
    assert b == 2 * a
