def compute_revenue(
    price_per_litre: float,
    volume_units: float,
    pack_size_ml: int | None,
    units_per_package: int | None,
) -> float | None:
    if pack_size_ml is None or units_per_package is None:
        return None
    price_per_item = price_per_litre * (pack_size_ml / 1000.0) * units_per_package
    return round(volume_units * price_per_item, 2)
