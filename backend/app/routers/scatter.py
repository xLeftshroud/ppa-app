from fastapi import APIRouter

from app.models.scatter_models import ScatterRequest, ScatterResponse
from app.services.scatter_service import get_scatter_points

router = APIRouter(tags=["scatter"])


@router.post("/scatter", response_model=ScatterResponse)
def scatter(body: ScatterRequest):
    points, count = get_scatter_points(body.filters)
    return ScatterResponse(points=points, count=count)
