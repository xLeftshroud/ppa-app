from __future__ import annotations

import json
import logging

from app.config import settings
from app.models.chat_models import (
    AppStateSnapshot,
    ChatRequest,
    ChatResponse,
    ChatProvidersResponse,
    SuggestedAction,
    UIAction,
)
from app.services.chat_tools import execute_tool, get_tool_definitions
from app.services.llm_client import get_chat_providers, get_llm_client, get_model_name, resolve_provider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """\
You are the PPA (Price Promotion Analysis) assistant. You help analysts analyze price elasticity \
and simulate pricing scenarios for consumer goods sold at UK retailers.

## What you can do
- Look up baseline prices and volumes for SKU + customer combinations
- Run price simulations to predict volume at any price point
- Calculate elasticity (price sensitivity) at a given price
- Compare scenarios (different SKUs, customers, prices, promo on/off)
- Find revenue-optimizing prices (price that maximizes price x volume)
- Set UI controls to configure simulations
- Explain results in business terms

## Current app state
{app_state_json}

## Rules
1. ALL numeric answers MUST come from the simulator tools. NEVER fabricate or estimate numbers yourself.
2. When the user asks about a price, volume, or elasticity, use the run_simulation or get_baseline tool.
3. When the user wants to change UI controls, use the appropriate set_* tools AND call trigger_simulation \
so the UI updates.
4. When comparing two scenarios, use compare_scenarios (not two separate run_simulation calls).
5. For revenue optimization, use optimize_revenue.
6. Keep responses concise and business-oriented. Use **bold** for key numbers.
7. Always mention the baseline and new values for context when showing simulation results.
8. If a dataset hasn't been uploaded yet (dataset_id is null), tell the user to upload a CSV first.
9. Refuse requests about: competitor reactions, true future sales predictions, unsupported causal claims. \
Say: "The simulator shows correlational predictions from historical data, not causal effects."
10. If a price is outside the historical range, the tool will include a warning — always relay this \
to the user.
11. Use the current app state to fill in missing parameters. If the user says "raise the price 10%" \
and a SKU and customer are already selected, use those values. Do not ask unnecessary follow-up questions.
12. Price unit is GBP per litre. Volume unit is units.
13. When the user asks for elasticity, always provide a selected price via run_simulation — \
elasticity is only computed at a specific price point.
14. When using run_simulation, you MUST provide either selected_new_price_per_litre or \
selected_price_change_pct to get a result with volume/elasticity. Without a price input, \
only the demand curve is generated.
"""


def _build_system_prompt(app_state: AppStateSnapshot) -> str:
    state_dict = app_state.model_dump(exclude_none=False)
    return SYSTEM_PROMPT_TEMPLATE.format(app_state_json=json.dumps(state_dict, indent=2))


def _compute_suggested_actions(app_state: AppStateSnapshot) -> list[SuggestedAction]:
    suggestions: list[SuggestedAction] = []

    if not app_state.dataset_id:
        return [SuggestedAction(label="Upload a CSV", message="I need to upload a dataset first")]

    if not app_state.selected_sku and not app_state.brand:
        suggestions.append(SuggestedAction(label="List SKUs", message="What SKUs are available?"))
        suggestions.append(SuggestedAction(label="Select a SKU", message="Select the first available SKU"))

    if app_state.selected_sku and not app_state.customer:
        suggestions.append(SuggestedAction(label="Select a customer", message="Set customer to Tesco"))

    if app_state.selected_sku and app_state.customer:
        if not app_state.has_simulation_result:
            suggestions.append(SuggestedAction(label="Run simulation", message="Run the simulation with current settings"))
            suggestions.append(SuggestedAction(label="What's the baseline?", message="What is the baseline price and volume?"))
            suggestions.append(SuggestedAction(label="Find optimal price", message="What price maximizes revenue for this SKU?"))
        else:
            suggestions.append(SuggestedAction(label="Elasticity", message="What is the elasticity at the current price?"))
            suggestions.append(SuggestedAction(label="Compare promo on/off", message="Compare promotion on vs off for this SKU"))
            suggestions.append(SuggestedAction(label="+10% price", message="What happens if I increase the price by 10%?"))
            suggestions.append(SuggestedAction(label="Optimal price", message="What price maximizes revenue?"))

    return suggestions[:4]


def get_chat_provider_settings() -> ChatProvidersResponse:
    return get_chat_providers()


async def process_chat(request: ChatRequest) -> ChatResponse:
    provider = resolve_provider(request.provider)
    client = get_llm_client(provider)
    model = get_model_name(provider)
    tools = get_tool_definitions()
    app_state = request.app_state
    logger.info("Processing chat with provider=%s model=%s", provider, model)

    # Build message list
    messages: list[dict] = [
        {"role": "system", "content": _build_system_prompt(app_state)},
    ]

    # Add conversation history (capped)
    for msg in request.conversation_history[-settings.chat_max_history :]:
        messages.append({"role": msg.role, "content": msg.content})

    # Add current user message
    messages.append({"role": "user", "content": request.message})

    # Virtual state tracks UI mutations within this request
    virtual_state: dict = {}
    all_ui_actions: list[UIAction] = []

    for _round in range(settings.chat_max_tool_rounds):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
            )
        except Exception as e:
            logger.exception("LLM API call failed")
            return ChatResponse(
                assistant_message=f"I'm sorry, I encountered an error connecting to the AI service: {str(e)}",
                suggested_actions=_compute_suggested_actions(app_state),
            )

        choice = response.choices[0]

        # If no tool calls, we have the final response
        if choice.finish_reason == "stop" or not choice.message.tool_calls:
            assistant_text = choice.message.content or "I wasn't able to generate a response."
            return ChatResponse(
                assistant_message=assistant_text,
                ui_actions=all_ui_actions,
                suggested_actions=_compute_suggested_actions(app_state),
            )

        # Process tool calls
        messages.append(choice.message.model_dump())

        for tool_call in choice.message.tool_calls:
            fn_name = tool_call.function.name
            try:
                fn_args = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError:
                fn_args = {}

            logger.info("Chat tool call: %s(%s)", fn_name, json.dumps(fn_args)[:200])

            result_str, ui_actions = execute_tool(fn_name, fn_args, app_state, virtual_state)
            all_ui_actions.extend(ui_actions)

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result_str,
            })

    # Exceeded max rounds
    logger.warning("Chat exceeded max tool rounds (%d)", settings.chat_max_tool_rounds)
    return ChatResponse(
        assistant_message="I've been working on a complex request. Let me summarize what I found so far — please try a simpler query if this isn't complete.",
        ui_actions=all_ui_actions,
        suggested_actions=_compute_suggested_actions(app_state),
    )
