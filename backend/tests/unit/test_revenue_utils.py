from app.services.revenue_utils import compute_revenue


def test_appletiser_150ml_single_can():
    # From data: APPLETISER 150ml x 1, price_per_litre=3.4253, price_per_item=£0.5138
    rev = compute_revenue(3.4253, 1, 150, 1)
    assert rev == 0.51


def test_fanta_330ml_8_pack():
    # From data: FANTA 330ml x 8, price_per_litre=1.3771, price_per_item=£3.6355
    rev = compute_revenue(1.3771, 1, 330, 8)
    assert rev == 3.64


def test_scales_with_volume():
    rev = compute_revenue(1.3771, 100, 330, 8)
    assert rev == 363.55


def test_missing_pack_size_returns_none():
    assert compute_revenue(1.5, 10, None, 6) is None


def test_missing_units_per_pkg_returns_none():
    assert compute_revenue(1.5, 10, 500, None) is None
