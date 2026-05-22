from pydantic import BaseModel, ConfigDict

class ResultsResponse(BaseModel):
    id: int
    score: int

    model_config = ConfigDict(from_attributes=True)
