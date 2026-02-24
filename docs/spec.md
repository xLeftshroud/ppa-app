你是一名资深全栈工程师 + ML 工程师，请为我生成一个**可运行的企业级 Web 应用原型**：用于 Price Elasticity / What-if Simulation（价格弹性/场景模拟）。该系统允许用户上传训练数据 CSV（无缺失值），选择/输入 SKU 与特征，自动计算 baseline，批量生成 demand curve（价格-销量曲线），并基于 ±1% 局部差分计算 elasticity。

### 0) 交付要求（必须满足）

- 输出一个完整可运行的 monorepo，包含：
  - `frontend/`（React app）
  - `backend/`（FastAPI server）
  - `docker-compose.yml`（一键启动前后端）
  - `README.md`（本地运行指令、环境变量、接口说明）
- 工业级工程质量：
  - 前端：TypeScript、严格表单校验、loading/error/warnings UI
  - 后端：Pydantic 校验、统一错误格式、请求 request_id、结构化日志
  - 模型：服务启动时加载 joblib pipeline（不得每请求 load）
- **禁止**引入任何“需要外部网络才能工作”的依赖或服务（除 npm/pip 安装）。
- 生成代码必须能直接跑（可用 mock 的 `pipeline.joblib` 推理逻辑占位，但结构必须是真实工业形态；如果没有真实模型文件，也要提供一个可替代的 DummyModel，确保 demo 可跑）。

------

## 1) 技术栈（必须按此生成）

### Frontend

- React 18 + TypeScript + Vite
- Tailwind CSS
- shadcn/ui（或同级别组件库；需包含 Select/Input/Slider/Card/Tabs/Dialog/Toast）
- TanStack Query (React Query)（API 请求、缓存、并发、状态）
- Zustand（全局状态：dataset_id、选中的输入、baseline、当前 price 点、warnings）
- React Hook Form + Zod（严格校验）
- ECharts + echarts-for-react（强交互曲线：tooltip、缩放、点高亮、markLine/markPoint）
- react-dropzone（CSV 拖拽上传）

### Backend

- FastAPI + Uvicorn
- pandas + numpy（CSV 解析/索引/批量构造输入、week_sin/cos、弹性计算）
- joblib + scikit-learn Pipeline（`pipeline.joblib`）
- `metadata.json`（模型版本、特征版本、训练分布阈值用于 warnings）
- python-multipart（文件上传）
- 结构化日志（标准 logging 即可，需带 request_id）

------

## 2) 业务定义与输入规则（必须严格遵守）

### 2.1 CSV 上传（训练数据格式，严格 schema，无缺失值）

用户上传 CSV（UTF-8、逗号分隔、最大 50MB、**无缺失值**）。必须包含且仅需校验这些列：

- `product_sku_code` (int)
- `customer` (enum，5 选 1)
- `yearweek` (int，用于找最新 baseline；模型推理不一定用，但必须存在)
- `nielsen_total_volume` (int，单位：units)
- `promotion_indicator` (int，0/1)
- `top_brand` (str)
- `flavor_internal` (str)
- `pack_type_internal` (str)
- `pack_size_internal` (int，例如 330 / 550 等)
- `units_per_package_internal` (int)
- `price_per_litre` (float)

> 注意：模型不使用 `material_medium_description`，任何相关内容不要出现。
>  pack_size_internal 是整数（真实数据只会出现 330、550 等）。

### 2.2 SKU 与属性关系（联动逻辑）

- SKU（`product_sku_code`）是唯一 ID。
- 一个 SKU 对应唯一组合：
   `top_brand, flavor_internal, pack_type_internal, pack_size_internal, units_per_package_internal`
- **不允许 override 与 SKU 不一致**：
  - 若用户输入/选择 SKU：系统自动填充上述属性（只读显示）
  - 若用户选择上述属性组合：系统反查唯一 SKU 并自动填入 SKU
  - 找不到匹配：提示 “No matching SKU”
  - 若出现多匹配（理论上不应发生）：弹窗要求用户选择

### 2.3 用户必须输入的预测控制变量

以下变量必须由用户指定（因为同 SKU 可对应多个 customer/促销/季节）：

- `customer`：从固定列表选择
   `{"L2_ASDA", "L2_CRTG", "L2_MORRISONS", "L2_SAINSBURY'S", "L2_TESCO"}`
- `promotion_indicator`：0/1
- `week`：1–52（不是 month，不是 yearweek）
  - 后端特征计算（必须严格用此公式）：
    - `week_sin = sin(2π * week / 52)`
    - `week_cos = cos(2π * week / 52)`

### 2.4 baseline 规则（必须严格）

baseline 受 customer 影响：

- 在上传 dataset 中，按 `product_sku_code == X AND customer == Y` 过滤
- 取 `yearweek` 最大的那一行作为最新 baseline row
- baseline_price = `price_per_litre`
- baseline_volume = `nielsen_total_volume`（用于显示 Δ）

若找不到 baseline：返回 `404 BASELINE_NOT_FOUND`（统一错误格式见后文）。

### 2.5 价格与约束

- 所有价格输入使用 `price_per_litre`
- 强制 `new_price_per_litre >= 0.01`（不允许 0 或负数）
- 训练分布外不拒绝（demo 需要可跑），但要返回 `warnings[]`（黄色提示）

------

## 3) 曲线与弹性（核心算法，必须严格实现）

### 3.1 曲线生成（Demand curve / Price–Volume）

当且仅当以下 key 变化时重新计算整条曲线（批量预测）：
 `dataset_id + product_sku_code + customer + week + promotion_indicator + baseline_price (若手动 override)`

曲线点生成规则：

- 以 baseline_price_per_litre 为中心
- 百分比范围：±100%
- 步长：5%
   `pct_grid = [-100, -95, ..., 0, ..., +95, +100]`（共 41 点）
- 每个点：
  - `price_i = baseline_price * (1 + pct/100)`
  - 强制 `price_i = max(0.01, price_i)`
- 对重复 `price_i` 去重（避免 baseline 很低导致多个点被 clamp 到 0.01）

后端应一次性构造 41 行输入（DataFrame），调用 pipeline 批量 `predict`，返回点集用于画线。

前端交互要求：

- 图表显示曲线（line）
- 当前用户选择的新价点（或当前 slider pct）要在图上高亮（markPoint）
- tooltip 显示：price、predicted volume、pct change、elasticity（如果可得）

### 3.2 单点预测展示（与曲线一致）

UI 右侧卡片区打印当前点的预测：

- baseline_price、baseline_volume
- selected new_price（或 pct）
- predicted volume
- Δvolume（vs baseline）
- Δvolume%（vs baseline）

### 3.3 弹性 elasticity（局部差分，必须按此实现）

弹性在“当前选择点”附近计算，**不要**用整条曲线粗略比值。

设当前点价格为 `P0`，预测销量为 `V0`：

- 计算 `P- = max(0.01, P0 * 0.99)`，`P+ = P0 * 1.01`
- 分别预测 `V-`、`V+`
- 用中心差分：
  - `elasticity = ((V+ - V-) / V0) / ((P+ - P-) / P0)`
- 若 `P- == P0`（因为 clamp 到 0.01）导致中心差分无效，则退化为单边差分（+1%）：
  - `elasticity = ((V+ - V0) / V0) / ((P+ - P0) / P0)`

弹性结果返回给前端，并显示在卡片中，同时 tooltip 可展示。

------

## 4) API 契约（必须实现）

### 4.1 Dataset 上传

`POST /v1/datasets/upload`（multipart/form-data）

- 输入：CSV 文件
- 输出（成功）：

```
{
  "dataset_id": "uuid",
  "row_count": 12345,
  "sku_count": 678,
  "customer_values": ["L2_TESCO", "..."],
  "message": "uploaded"
}
```

### 4.2 Catalog（用于下拉）

```
GET /v1/catalog/skus?dataset_id=...
```

- 返回 SKU 列表及其属性（用于自动填充）：

```
{
  "items": [
    {
      "product_sku_code": 407477,
      "top_brand": "COCA-COLA",
      "flavor_internal": "COLA",
      "pack_type_internal": "CAN",
      "pack_size_internal": 330,
      "units_per_package_internal": 1
    }
  ]
}
GET /v1/catalog/customers
```

- 返回固定 enum 五项

```
GET /v1/catalog/promotions
```

- 返回 `[0,1]`

（可选）`POST /v1/catalog/sku-lookup`：用属性组合反查 SKU（唯一）

### 4.3 Baseline 查询

```
GET /v1/baseline?dataset_id=...&product_sku_code=...&customer=...
```

- 返回 baseline_price、baseline_volume、baseline_yearweek

### 4.4 场景模拟（曲线 + 当前点 + elasticity）

`POST /v1/simulate`
 请求：

```
{
  "dataset_id": "uuid",
  "product_sku_code": 407477,
  "customer": "L2_TESCO",
  "promotion_indicator": 1,
  "week": 21,

  "baseline_override_price_per_litre": null,
  "selected_price_change_pct": 30,
  "selected_new_price_per_litre": null
}
```

规则：

- baseline 若 override 为空 → 后端按 baseline 规则自动取最新
- 若 `selected_new_price_per_litre` 非空 → 优先使用它，并反算 pct（用于 UI 显示）
- 否则使用 `selected_price_change_pct` 基于 baseline 计算 new_price

响应（示意）：

```
{
  "model_info": {"model_name":"PPA_PIPELINE","model_version":"2026-xx-xx","features_version":"v1"},
  "warnings": ["price outside training p99"],
  "baseline": {"yearweek": 202521, "price_per_litre": 1.4924, "volume_units": 9153},
  "selected": {
    "price_change_pct": 30,
    "new_price_per_litre": 1.939,
    "predicted_volume_units": 8000,
    "delta_volume_units": -1153,
    "delta_volume_pct": -0.1259,
    "elasticity": -0.45
  },
  "curve": [
    {"price_change_pct": -100, "price_per_litre": 0.01, "predicted_volume_units": 12000},
    ...
    {"price_change_pct": 100, "price_per_litre": 2.9848, "predicted_volume_units": 6000}
  ]
}
```

------

## 5) 模型加载与推理（必须工业级）

- `pipeline.joblib`：scikit-learn Pipeline（包含预处理 + 模型）
- `metadata.json`：至少包含
  - model_version, features_version
  - price_per_litre 的训练分布阈值（min/max 或 p1/p99）用于 warnings
- 后端启动时加载到内存（FastAPI startup event）：
  - **禁止**每次请求 joblib.load
- 推理输入构造（注意：`product_sku_code` 不是模型特征，因为它由 brand/flavor/pack 属性组成）：
  - 模型特征（共 10 列）：`customer, top_brand, flavor_internal, pack_type_internal, promotion_indicator, pack_size_internal, units_per_package_internal, price_per_litre, week_sin, week_cos`
  - SKU 相关属性（brand/flavor/pack/size/units）从 dataset 中按 sku 查到并填入（确保一致）
- 批量预测：
  - 曲线 41 点一次 DataFrame → `pipeline.predict(df)` 一次返回数组

如果没有真实模型文件：

- 必须提供 DummyPipeline（保持接口一致），确保 demo 可运行，并在 README 里注明替换真实模型的方法。

------

## 6) 统一错误格式（必须严格，全接口通用）

任何错误都返回以下结构：

```
{
  "error": {
    "code": "CSV_SCHEMA_INVALID",
    "message": "CSV validation failed",
    "details": [
      {"row": 12, "column": "promotion_indicator", "reason": "must be 0 or 1"}
    ],
    "request_id": "uuid"
  }
}
```

错误码与 HTTP：

- `CSV_PARSE_ERROR` → 400
- `CSV_SCHEMA_INVALID` → 422
- `BASELINE_NOT_FOUND` → 404
- `INFERENCE_ERROR` → 500
- `VALIDATION_ERROR`（请求体字段非法，例如 week 不在 1-52、price<0.01）→ 422

前端必须将 `request_id` 展示在错误 toast 的 “details” 区域，便于排查。

------

## 7) 前端 UI 需求（必须实现）

页面布局：左输入、右输出、上方可有 dataset 状态栏。

左侧（Inputs）：

- CSV 上传区（拖拽 + 上传按钮）→ 成功后显示 dataset_id、行数、SKU 数
- SKU 选择（下拉）+ 属性只读展示
- 允许用户用属性组合反查 SKU（可选 Tab：By SKU / By Attributes）
- customer 下拉（5 选 1）
- promotion_indicator 切换（0/1）
- week 输入（1–52，NumberInput）
- baseline_price（自动填充，允许用户手动 override）
- selected price：
  - slider：price_change_pct（-100 到 +100，步长 1）
  - 或 new_price_per_litre 数字输入（若填则优先）
- Run 按钮（也可自动触发：输入稳定后 debounce 300ms 调用 simulate）

右侧（Results & Chart）：

- 卡片：baseline、selected new price、predicted volume、Δ、Δ%、elasticity
- ECharts 曲线：
  - line：curve 点集
  - markPoint：selected 点
  - tooltip：显示 price、volume、pct、elasticity
  - dataZoom：可缩放查看
- warnings 显示区（黄色提示条）

状态与体验：

- loading skeleton
- 错误 toast + request_id
- 将 simulate 请求结果缓存（React Query key 由 dataset_id + sku + customer + week + promo + baseline_override + selected_new_price/pct 构成）

------

## 8) 项目结构（建议，生成时请遵守）

```
repo/
  frontend/
    src/
      api/
      components/
      pages/
      store/
      schemas/
  backend/
    app/
      main.py
      routers/
      services/
      models/
      utils/
    data/uploads/
  docker-compose.yml
  README.md
```

------

## 9) 输出要求

请输出：

1. 完整代码（按上述结构）
2. README：如何安装依赖、如何启动、如何替换真实 pipeline.joblib
3. OpenAPI 路由说明（FastAPI 默认文档即可）
4. 说明你如何保证：CSV 严格校验、baseline 逻辑、曲线 41 点批量预测、弹性 ±1% 差分、warnings 与统一错误格式