from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Any

from app.models.chat_models import AppStateSnapshot, ChatCustomPlotSummary, UIAction
from app.models.request_models import PredictPointsRequest, SimulateRequest
from app.services.catalog_service import (
    get_distinct_brands,
    get_distinct_customers,
    get_distinct_flavors,
    get_distinct_pack_types,
    get_sku_attributes,
    get_sku_catalog,
)
from app.services.dataset_service import get_dataset
from app.services.historical_price_service import get_historical_price
from app.services.optimization_service import optimize_revenue
from app.services.price_range_service import get_price_range
from app.services.revenue_utils import compute_revenue
from app.services.simulation_service import predict_points, run_simulation
from app.utils.error_handler import AppError, HistoricalPriceNotFound

logger = logging.getLogger(__name__)


CUSTOM_PLOT_COLUMNS = [
    "product_sku_code",
    "customer",
    "top_brand",
    "flavor_internal",
    "pack_type_internal",
    "pack_size_internal",
    "units_per_package_internal",
    "promotion_indicator",
]
CUSTOM_PLOT_COLOR_PALETTE = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
]
HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")

# ---------------------------------------------------------------------------
# Tool definitions (OpenAI function-calling schema)
# ---------------------------------------------------------------------------

TOOL_DEFINITIONS: list[dict] = [
    # ── Data tools (executed server-side) ──
    {
        "type": "function",
        "function": {
            "name": "get_historical_price",
            "description": "Get the most recent historical price and volume for a SKU at a specific customer (yearweek, price_per_litre, volume_units). This is reference data from training records — NOT the user's current simulation baseline input.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_sku_code": {"type": "integer", "description": "The SKU code"},
                    "customer": {"type": "string"},
                },
                "required": ["product_sku_code", "customer"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_simulation",
            "description": "Run a price-volume simulation. Returns baseline, predicted volume at the selected price, volume change, elasticity, and the full demand curve. You MUST provide at least one price input (selected_new_price_per_litre or selected_price_change_pct) to get a selected-point result with elasticity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_sku_code": {"type": "integer"},
                    "customer": {"type": "string"},
                    "promotion_indicator": {"type": "integer", "enum": [0, 1]},
                    "week": {"type": "integer", "minimum": 1, "maximum": 52},
                    "top_brand": {"type": "string"},
                    "flavor_internal": {"type": "string"},
                    "pack_type_internal": {"type": "string"},
                    "pack_size_internal": {"type": "integer"},
                    "units_per_package_internal": {"type": "integer"},
                    "baseline_price_per_litre": {"type": "number", "minimum": 0.01},
                    "selected_price_change_pct": {"type": "number", "minimum": -100, "maximum": 100},
                    "selected_new_price_per_litre": {"type": "number", "minimum": 0.01},
                },
                "required": ["customer", "promotion_indicator", "week"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "predict_at_price",
            "description": "Lightweight prediction at 1-2 price points WITHOUT regenerating the demand curve. Returns predicted volume, elasticity, revenue, and delta at the baseline price and/or a selected price. Use this instead of run_simulation when you only need volume/elasticity at specific prices and the curve is not needed. Much faster than run_simulation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_sku_code": {"type": "integer"},
                    "customer": {"type": "string"},
                    "promotion_indicator": {"type": "integer", "enum": [0, 1]},
                    "week": {"type": "integer", "minimum": 1, "maximum": 52},
                    "top_brand": {"type": "string"},
                    "flavor_internal": {"type": "string"},
                    "pack_type_internal": {"type": "string"},
                    "pack_size_internal": {"type": "integer"},
                    "units_per_package_internal": {"type": "integer"},
                    "baseline_price_per_litre": {"type": "number", "minimum": 0.01},
                    "selected_new_price_per_litre": {"type": "number", "minimum": 0.01},
                },
                "required": ["customer", "promotion_indicator", "week"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_price_range",
            "description": "Get the historical price distribution (percentiles p1, p5, p50, p95, p99) and sample size for a SKU from training data. Use this to check if a price is within the historical range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_sku_code": {"type": "integer"},
                },
                "required": ["product_sku_code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_skus",
            "description": "List all available SKUs in the uploaded dataset with their attributes (brand, flavor, pack type, pack size, units per package). Returns up to 50 SKUs. Use this when the user asks what SKUs are available or wants to find a specific product.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_customers",
            "description": "List all distinct customer names in the uploaded dataset.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_brands",
            "description": "List all distinct brand names in the uploaded dataset.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_custom_plots",
            "description": "List all custom plot overlays currently configured in the app. Returns plot_id, title, color, visibility, and filter columns.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_scenarios",
            "description": "Compare two simulation scenarios side by side. Returns baseline, predicted volume, elasticity, and revenue for both, plus the difference. Use this for comparisons between SKUs, customers, promo on/off, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "scenario_a": {
                        "type": "object",
                        "description": "First scenario configuration",
                        "properties": {
                            "label": {"type": "string", "description": "Human-readable label"},
                            "product_sku_code": {"type": "integer"},
                            "customer": {"type": "string"},
                            "promotion_indicator": {"type": "integer", "enum": [0, 1]},
                            "week": {"type": "integer", "minimum": 1, "maximum": 52},
                            "top_brand": {"type": "string"},
                            "flavor_internal": {"type": "string"},
                            "pack_type_internal": {"type": "string"},
                            "pack_size_internal": {"type": "integer"},
                            "units_per_package_internal": {"type": "integer"},
                            "baseline_price_per_litre": {"type": "number"},
                            "selected_price_change_pct": {"type": "number"},
                            "selected_new_price_per_litre": {"type": "number"},
                        },
                        "required": ["customer", "promotion_indicator", "week"],
                    },
                    "scenario_b": {
                        "type": "object",
                        "description": "Second scenario configuration",
                        "properties": {
                            "label": {"type": "string", "description": "Human-readable label"},
                            "product_sku_code": {"type": "integer"},
                            "customer": {"type": "string"},
                            "promotion_indicator": {"type": "integer", "enum": [0, 1]},
                            "week": {"type": "integer", "minimum": 1, "maximum": 52},
                            "top_brand": {"type": "string"},
                            "flavor_internal": {"type": "string"},
                            "pack_type_internal": {"type": "string"},
                            "pack_size_internal": {"type": "integer"},
                            "units_per_package_internal": {"type": "integer"},
                            "baseline_price_per_litre": {"type": "number"},
                            "selected_price_change_pct": {"type": "number"},
                            "selected_new_price_per_litre": {"type": "number"},
                        },
                        "required": ["customer", "promotion_indicator", "week"],
                    },
                },
                "required": ["scenario_a", "scenario_b"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "optimize_revenue",
            "description": "Find the price that maximizes revenue (gross sales: volume_units x price_per_item) for the given configuration. Optionally restrict the search to a price range (e.g. p5–p95 from get_price_range). Returns optimal price, volume, revenue, and comparison to baseline revenue.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_sku_code": {"type": "integer"},
                    "customer": {"type": "string"},
                    "promotion_indicator": {"type": "integer", "enum": [0, 1]},
                    "week": {"type": "integer", "minimum": 1, "maximum": 52},
                    "top_brand": {"type": "string"},
                    "flavor_internal": {"type": "string"},
                    "pack_type_internal": {"type": "string"},
                    "pack_size_internal": {"type": "integer"},
                    "units_per_package_internal": {"type": "integer"},
                    "baseline_price_per_litre": {"type": "number"},
                    "min_price": {"type": "number", "minimum": 0.01, "description": "Minimum price to search (e.g. p5 value). Omit for no lower bound."},
                    "max_price": {"type": "number", "minimum": 0.01, "description": "Maximum price to search (e.g. p95 value). Omit for no upper bound."},
                },
                "required": ["customer", "promotion_indicator", "week"],
            },
        },
    },
    # ── UI tools (produce action descriptors for frontend) ──
    {
        "type": "function",
        "function": {
            "name": "set_sku",
            "description": "Set the selected SKU in the UI controls. This also populates brand, flavor, pack type, and other attributes from the SKU catalog.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_sku_code": {"type": "integer"},
                },
                "required": ["product_sku_code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_customer",
            "description": "Set the customer selection in the UI.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer": {"type": "string"},
                },
                "required": ["customer"],
            },
        },
    },
    # ── Individual simulation param tools ──
    {
        "type": "function",
        "function": {
            "name": "set_promotion",
            "description": "Set the promotion indicator in the UI (0 = no promotion, 1 = promotion).",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "integer", "enum": [0, 1]}},
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_week",
            "description": "Set the week number (1–52) in the UI.",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "integer", "minimum": 1, "maximum": 52}},
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_baseline_price",
            "description": "Set the baseline price override (GBP per litre) in the UI.",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "number", "minimum": 0.01}},
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_price_change_pct",
            "description": "Set the price change percentage in the UI and switch to percentage input mode.",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "number", "minimum": -100, "maximum": 100}},
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_new_price",
            "description": "Set a direct price (GBP per litre) in the UI and switch to direct price input mode.",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "number", "minimum": 0.01}},
                "required": ["value"],
            },
        },
    },
    # ── Individual SKU attribute tools ──
    {
        "type": "function",
        "function": {
            "name": "set_brand",
            "description": "Set the brand (top_brand) in the UI without selecting a specific SKU.",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "string"}},
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_flavor",
            "description": "Set the flavor (flavor_internal) in the UI without selecting a specific SKU.",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "string"}},
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_pack_type",
            "description": "Set the pack type (pack_type_internal) in the UI without selecting a specific SKU.",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "string"}},
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_pack_size",
            "description": "Set the pack size (pack_size_internal) in the UI without selecting a specific SKU.",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "integer"}},
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_units_pkg",
            "description": "Set the units per package (units_per_package_internal) in the UI without selecting a specific SKU.",
            "parameters": {
                "type": "object",
                "properties": {"value": {"type": "integer"}},
                "required": ["value"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "clear_selections",
            "description": "Clear all SKU and attribute selections in the UI, resetting to blank state.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "trigger_simulation",
            "description": "Trigger the Run Simulation button in the UI using the currently configured parameters. Call this after setting parameters if you want the main UI panel to update with new results.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_custom_plot",
            "description": "Add a scatter plot overlay to the demand curve chart, showing historical data points filtered by the specified columns.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "plot_id": {
                        "type": "string",
                        "description": "Optional plot identifier. Omit to auto-generate a new plot_id.",
                    },
                    "columns": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": CUSTOM_PLOT_COLUMNS,
                        },
                    },
                    "color": {
                        "type": "string",
                        "description": "Optional hex color like #EF4444.",
                    },
                    "is_visible": {
                        "type": "boolean",
                        "description": "Optional visibility flag. Defaults to true.",
                    },
                },
                "required": ["title", "columns"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_custom_plot",
            "description": "Update an existing custom plot by plot_id. Use this to change the title, filter columns, color, or visibility.",
            "parameters": {
                "type": "object",
                "properties": {
                    "plot_id": {"type": "string"},
                    "title": {"type": "string"},
                    "columns": {
                        "type": "array",
                        "items": {"type": "string", "enum": CUSTOM_PLOT_COLUMNS},
                    },
                    "color": {"type": "string", "description": "Hex color like #EF4444."},
                    "is_visible": {"type": "boolean"},
                },
                "required": ["plot_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remove_custom_plot",
            "description": "Remove a single custom plot by plot_id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "plot_id": {"type": "string"},
                },
                "required": ["plot_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "clear_custom_plots",
            "description": "Remove all custom plots from the app.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


def get_tool_definitions() -> list[dict]:
    return TOOL_DEFINITIONS


# ---------------------------------------------------------------------------
# Tool execution
# ---------------------------------------------------------------------------

def _build_sim_request(
    args: dict,
    app_state: AppStateSnapshot,
    virtual_state: dict,
) -> SimulateRequest:
    """Build a SimulateRequest merging tool args with current app/virtual state."""

    # Merge: tool args > virtual state > app state
    def _resolve(key: str, app_val: Any) -> Any:
        if key in args and args[key] is not None:
            return args[key]
        if key in virtual_state and virtual_state[key] is not None:
            return virtual_state[key]
        return app_val

    return SimulateRequest(
        product_sku_code=_resolve("product_sku_code", app_state.selected_sku),
        customer=_resolve("customer", app_state.customer),
        promotion_indicator=_resolve("promotion_indicator", app_state.promotion),
        week=_resolve("week", app_state.week),
        top_brand=_resolve("top_brand", app_state.brand),
        flavor_internal=_resolve("flavor_internal", app_state.flavor),
        pack_type_internal=_resolve("pack_type_internal", app_state.pack_type),
        pack_size_internal=_resolve("pack_size_internal", app_state.pack_size),
        units_per_package_internal=_resolve("units_per_package_internal", app_state.units_pkg),
        baseline_override_price_per_litre=args.get("baseline_price_per_litre", app_state.baseline_price),
        selected_price_change_pct=args.get("selected_price_change_pct"),
        selected_new_price_per_litre=args.get("selected_new_price_per_litre"),
    )


def _build_predict_request(
    args: dict,
    app_state: AppStateSnapshot,
    virtual_state: dict,
) -> PredictPointsRequest:
    """Build a PredictPointsRequest merging tool args with current app/virtual state."""

    def _resolve(key: str, app_val: Any) -> Any:
        if key in args and args[key] is not None:
            return args[key]
        if key in virtual_state and virtual_state[key] is not None:
            return virtual_state[key]
        return app_val

    return PredictPointsRequest(
        product_sku_code=_resolve("product_sku_code", app_state.selected_sku),
        customer=_resolve("customer", app_state.customer),
        promotion_indicator=_resolve("promotion_indicator", app_state.promotion),
        week=_resolve("week", app_state.week),
        top_brand=_resolve("top_brand", app_state.brand),
        flavor_internal=_resolve("flavor_internal", app_state.flavor),
        pack_type_internal=_resolve("pack_type_internal", app_state.pack_type),
        pack_size_internal=_resolve("pack_size_internal", app_state.pack_size),
        units_per_package_internal=_resolve("units_per_package_internal", app_state.units_pkg),
        baseline_price=args.get("baseline_price_per_litre", app_state.baseline_price),
        selected_price=args.get("selected_new_price_per_litre"),
    )


def _get_virtual_custom_plots(
    app_state: AppStateSnapshot,
    virtual_state: dict,
) -> list[ChatCustomPlotSummary]:
    if "custom_plots" not in virtual_state:
        virtual_state["custom_plots"] = [plot.model_copy(deep=True) for plot in app_state.custom_plots]
    return virtual_state["custom_plots"]


def _serialize_custom_plots(plots: list[ChatCustomPlotSummary]) -> list[dict[str, Any]]:
    return [_serialize_custom_plot(plot) for plot in plots]


def _serialize_custom_plot(plot: ChatCustomPlotSummary) -> dict[str, Any]:
    payload = plot.model_dump()
    payload["plot_id"] = plot.id
    return payload


def _validate_custom_plot_columns(columns: Any) -> list[str]:
    if not isinstance(columns, list) or len(columns) == 0:
        raise ValueError("Custom plot must include at least one filter column.")

    normalized: list[str] = []
    seen: set[str] = set()
    for column in columns:
        if not isinstance(column, str) or column not in CUSTOM_PLOT_COLUMNS:
            raise ValueError(f"Unsupported custom plot column: {column}")
        if column in seen:
            raise ValueError(f"Duplicate custom plot column: {column}")
        seen.add(column)
        normalized.append(column)
    return normalized


def _validate_custom_plot_color(color: Any) -> str:
    if not isinstance(color, str) or not HEX_COLOR_PATTERN.fullmatch(color):
        raise ValueError("Custom plot color must be a hex string like #RRGGBB.")
    return color.lower()


def _find_custom_plot_index(plots: list[ChatCustomPlotSummary], plot_id: str) -> int:
    for index, plot in enumerate(plots):
        if plot.id == plot_id:
            return index
    return -1


def _ensure_plot_visibility(value: Any) -> bool:
    if not isinstance(value, bool):
        raise ValueError("Custom plot visibility must be true or false.")
    return value


def execute_tool(
    tool_name: str,
    tool_args: dict,
    app_state: AppStateSnapshot,
    virtual_state: dict,
) -> tuple[str, list[UIAction]]:
    """Execute a tool and return (result_json_string, ui_actions_list)."""
    ui_actions: list[UIAction] = []

    try:
        if tool_name == "get_historical_price":
            df = get_dataset()
            result = get_historical_price(df, tool_args["product_sku_code"], tool_args["customer"])
            return json.dumps(result), ui_actions

        elif tool_name == "run_simulation":
            req = _build_sim_request(tool_args, app_state, virtual_state)
            resp = run_simulation(req)
            # Return a compact summary (not the full curve)
            summary: dict[str, Any] = {
                "model": resp.model_info.model_name,
                "warnings": resp.warnings,
            }
            if resp.baseline:
                summary["baseline"] = {
                    "price_per_litre": resp.baseline.price_per_litre,
                    "volume_units": resp.baseline.volume_units,
                    "yearweek": resp.baseline.yearweek,
                }
            if resp.selected:
                summary["selected"] = {
                    "new_price_per_litre": resp.selected.new_price_per_litre,
                    "predicted_volume_units": resp.selected.predicted_volume_units,
                    "delta_volume_units": resp.selected.delta_volume_units,
                    "delta_volume_pct": resp.selected.delta_volume_pct,
                    "elasticity": resp.selected.elasticity,
                    "price_change_pct": resp.selected.price_change_pct,
                }
            summary["curve_points_count"] = len(resp.curve)
            return json.dumps(summary), ui_actions

        elif tool_name == "predict_at_price":
            req = _build_predict_request(tool_args, app_state, virtual_state)
            resp = predict_points(req)
            summary: dict[str, Any] = {}
            if resp.baseline:
                summary["baseline"] = {
                    "price_per_litre": resp.baseline.price_per_litre,
                    "predicted_volume_units": resp.baseline.predicted_volume,
                    "elasticity": resp.baseline.elasticity,
                }
            if resp.selected:
                summary["selected"] = {
                    "price_per_litre": resp.selected.price_per_litre,
                    "predicted_volume_units": resp.selected.predicted_volume,
                    "elasticity": resp.selected.elasticity,
                }
            if resp.baseline and resp.selected:
                bl_vol = resp.baseline.predicted_volume
                sel_vol = resp.selected.predicted_volume
                bl_price = resp.baseline.price_per_litre
                sel_price = resp.selected.price_per_litre
                if bl_vol != 0:
                    summary["delta_volume_units"] = round(sel_vol - bl_vol, 2)
                    summary["delta_volume_pct"] = round((sel_vol - bl_vol) / bl_vol, 6)
                summary["baseline_revenue"] = compute_revenue(bl_price, bl_vol)
                summary["selected_revenue"] = compute_revenue(sel_price, sel_vol)
            if resp.arc_elasticity is not None:
                summary["arc_elasticity"] = resp.arc_elasticity
            return json.dumps(summary), ui_actions

        elif tool_name == "get_price_range":
            result = get_price_range(tool_args["product_sku_code"])
            if result is None:
                return json.dumps({"error": f"No price range data for SKU {tool_args['product_sku_code']}"}), ui_actions
            return json.dumps(result), ui_actions

        elif tool_name == "list_skus":
            df = get_dataset()
            skus = get_sku_catalog(df)
            # Cap at 50 to keep token usage reasonable
            return json.dumps({"skus": skus[:50], "total": len(skus)}), ui_actions

        elif tool_name == "list_customers":
            df = get_dataset()
            customers = get_distinct_customers(df)
            return json.dumps({"customers": customers}), ui_actions

        elif tool_name == "list_brands":
            df = get_dataset()
            brands = get_distinct_brands(df)
            return json.dumps({"brands": brands}), ui_actions

        elif tool_name == "list_custom_plots":
            plots = _get_virtual_custom_plots(app_state, virtual_state)
            return json.dumps({"plots": _serialize_custom_plots(plots), "count": len(plots)}), ui_actions

        elif tool_name == "compare_scenarios":
            results = {}
            for key in ("scenario_a", "scenario_b"):
                scenario = tool_args[key]
                label = scenario.pop("label", key)
                req = _build_sim_request(scenario, app_state, virtual_state)
                resp = run_simulation(req)
                s: dict[str, Any] = {"label": label, "warnings": resp.warnings}
                if resp.baseline:
                    s["baseline_price"] = resp.baseline.price_per_litre
                    s["baseline_volume"] = resp.baseline.volume_units
                    s["baseline_revenue"] = compute_revenue(resp.baseline.price_per_litre, resp.baseline.volume_units)
                if resp.selected:
                    s["new_price"] = resp.selected.new_price_per_litre
                    s["predicted_volume"] = resp.selected.predicted_volume_units
                    s["delta_volume_units"] = resp.selected.delta_volume_units
                    s["delta_volume_pct"] = resp.selected.delta_volume_pct
                    s["elasticity"] = resp.selected.elasticity
                    s["revenue"] = compute_revenue(resp.selected.new_price_per_litre, resp.selected.predicted_volume_units)
                results[key] = s
            return json.dumps(results), ui_actions

        elif tool_name == "optimize_revenue":
            req = _build_sim_request(tool_args, app_state, virtual_state)
            result = optimize_revenue(
                req,
                min_price=tool_args.get("min_price"),
                max_price=tool_args.get("max_price"),
            )
            return json.dumps(result), ui_actions

        # ── UI tools ──

        elif tool_name == "set_sku":
            sku_code = tool_args["product_sku_code"]
            df = get_dataset()
            attrs = get_sku_attributes(df, sku_code)
            ui_actions.append(UIAction(action="set_sku", params={"sku": sku_code, "attrs": attrs}))
            virtual_state["product_sku_code"] = sku_code
            if attrs:
                virtual_state["top_brand"] = attrs.get("top_brand")
                virtual_state["flavor_internal"] = attrs.get("flavor_internal")
                virtual_state["pack_type_internal"] = attrs.get("pack_type_internal")
                virtual_state["pack_size_internal"] = attrs.get("pack_size_internal")
                virtual_state["units_per_package_internal"] = attrs.get("units_per_package_internal")
            return json.dumps({"ok": True, "sku": sku_code, "attrs": attrs}), ui_actions

        elif tool_name == "set_customer":
            customer = tool_args["customer"]
            ui_actions.append(UIAction(action="set_customer", params={"customer": customer}))
            virtual_state["customer"] = customer
            return json.dumps({"ok": True, "customer": customer}), ui_actions

        # ── Individual simulation param tools ──

        elif tool_name == "set_promotion":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_promotion", params={"value": val}))
            virtual_state["promotion_indicator"] = val
            return json.dumps({"ok": True, "promotion_indicator": val}), ui_actions

        elif tool_name == "set_week":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_week", params={"value": val}))
            virtual_state["week"] = val
            return json.dumps({"ok": True, "week": val}), ui_actions

        elif tool_name == "set_baseline_price":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_baseline_price", params={"value": val}))
            return json.dumps({"ok": True, "baseline_price": val}), ui_actions

        elif tool_name == "set_price_change_pct":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_price_change_pct", params={"value": val}))
            return json.dumps({"ok": True, "price_change_pct": val}), ui_actions

        elif tool_name == "set_new_price":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_new_price", params={"value": val}))
            return json.dumps({"ok": True, "new_price": val}), ui_actions

        # ── Individual SKU attribute tools ──

        elif tool_name == "set_brand":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_brand", params={"value": val}))
            virtual_state["top_brand"] = val
            return json.dumps({"ok": True, "brand": val}), ui_actions

        elif tool_name == "set_flavor":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_flavor", params={"value": val}))
            virtual_state["flavor_internal"] = val
            return json.dumps({"ok": True, "flavor": val}), ui_actions

        elif tool_name == "set_pack_type":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_pack_type", params={"value": val}))
            virtual_state["pack_type_internal"] = val
            return json.dumps({"ok": True, "pack_type": val}), ui_actions

        elif tool_name == "set_pack_size":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_pack_size", params={"value": val}))
            virtual_state["pack_size_internal"] = val
            return json.dumps({"ok": True, "pack_size": val}), ui_actions

        elif tool_name == "set_units_pkg":
            val = tool_args["value"]
            ui_actions.append(UIAction(action="set_units_pkg", params={"value": val}))
            virtual_state["units_per_package_internal"] = val
            return json.dumps({"ok": True, "units_pkg": val}), ui_actions

        elif tool_name == "clear_selections":
            ui_actions.append(UIAction(action="clear_selections", params={}))
            return json.dumps({"ok": True}), ui_actions

        elif tool_name == "trigger_simulation":
            ui_actions.append(UIAction(action="trigger_simulation", params={}))
            return json.dumps({"ok": True}), ui_actions

        elif tool_name == "add_custom_plot":
            plots = _get_virtual_custom_plots(app_state, virtual_state)
            plot_id = tool_args.get("plot_id")
            if plot_id is not None and not isinstance(plot_id, str):
                raise ValueError("Custom plot id must be a string.")
            plot_id = plot_id or f"chat-plot-{uuid.uuid4().hex[:12]}"
            if _find_custom_plot_index(plots, plot_id) >= 0:
                raise ValueError(f"Custom plot id already exists: {plot_id}")

            title = str(tool_args["title"]).strip()
            if not title:
                raise ValueError("Custom plot title cannot be empty.")

            columns = _validate_custom_plot_columns(tool_args["columns"])
            color = (
                _validate_custom_plot_color(tool_args["color"])
                if "color" in tool_args and tool_args["color"] is not None
                else CUSTOM_PLOT_COLOR_PALETTE[len(plots) % len(CUSTOM_PLOT_COLOR_PALETTE)]
            )
            is_visible = (
                _ensure_plot_visibility(tool_args["is_visible"])
                if "is_visible" in tool_args
                else True
            )

            plot = ChatCustomPlotSummary(
                id=plot_id,
                title=title,
                color=color,
                is_visible=is_visible,
                columns=columns,
            )
            plots.append(plot)
            ui_actions.append(UIAction(
                action="add_custom_plot",
                params=plot.model_dump(),
            ))
            return json.dumps({"ok": True, "plot": _serialize_custom_plot(plot)}), ui_actions

        elif tool_name == "update_custom_plot":
            plots = _get_virtual_custom_plots(app_state, virtual_state)
            plot_id = tool_args["plot_id"]
            plot_index = _find_custom_plot_index(plots, plot_id)
            if plot_index < 0:
                raise ValueError(f"Custom plot not found: {plot_id}")

            patch: dict[str, Any] = {}
            if "title" in tool_args:
                title = str(tool_args["title"]).strip()
                if not title:
                    raise ValueError("Custom plot title cannot be empty.")
                patch["title"] = title
            if "columns" in tool_args:
                patch["columns"] = _validate_custom_plot_columns(tool_args["columns"])
            if "color" in tool_args:
                patch["color"] = _validate_custom_plot_color(tool_args["color"])
            if "is_visible" in tool_args:
                patch["is_visible"] = _ensure_plot_visibility(tool_args["is_visible"])
            if not patch:
                raise ValueError("No custom plot changes were provided.")

            updated_plot = plots[plot_index].model_copy(update=patch)
            plots[plot_index] = updated_plot
            ui_actions.append(UIAction(
                action="update_custom_plot",
                params={"plot_id": plot_id, **patch},
            ))
            return json.dumps({"ok": True, "plot": _serialize_custom_plot(updated_plot)}), ui_actions

        elif tool_name == "remove_custom_plot":
            plots = _get_virtual_custom_plots(app_state, virtual_state)
            plot_id = tool_args["plot_id"]
            plot_index = _find_custom_plot_index(plots, plot_id)
            if plot_index < 0:
                raise ValueError(f"Custom plot not found: {plot_id}")

            removed_plot = plots.pop(plot_index)
            ui_actions.append(UIAction(
                action="remove_custom_plot",
                params={"plot_id": plot_id},
            ))
            return json.dumps({"ok": True, "removed_plot": _serialize_custom_plot(removed_plot)}), ui_actions

        elif tool_name == "clear_custom_plots":
            plots = _get_virtual_custom_plots(app_state, virtual_state)
            removed_count = len(plots)
            plots.clear()
            ui_actions.append(UIAction(action="clear_custom_plots", params={}))
            return json.dumps({"ok": True, "removed_count": removed_count}), ui_actions

        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"}), ui_actions

    except HistoricalPriceNotFound as e:
        return json.dumps({"error": str(e)}), ui_actions
    except AppError as e:
        return json.dumps({"error": f"{e.code}: {e.message}"}), ui_actions
    except Exception as e:
        logger.exception("Tool execution error: %s", tool_name)
        return json.dumps({"error": f"Tool execution failed: {str(e)}"}), ui_actions
