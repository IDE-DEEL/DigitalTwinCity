from typing import List

from fastapi import APIRouter, Depends
from backend.schemas.results import ResultsResponse
from backend.services.results_service import ResultsService, get_results_service

router = APIRouter(prefix="/results", tags=["results"])

@router.get("/{id}", response_model=ResultsResponse)
async def read_result(id: int, service: ResultsService = Depends(get_results_service)):
    return service.get_results(id)


@router.get("/", response_model=List[ResultsResponse])
async def read_results(service: ResultsService = Depends(get_results_service)):
    return service.get_all_results()


@router.post("/", response_model=ResultsResponse)
async def create_result(service: ResultsService = Depends(get_results_service)):
    return service.create_results()
