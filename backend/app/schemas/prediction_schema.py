"""Pydantic request/response contracts for the SmartCar API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

FuelType = Literal["Petrol", "Diesel", "CNG", "LPG"]
SellerType = Literal["Dealer", "Individual", "Trustmark Dealer"]
TransmissionType = Literal["Manual", "Automatic"]
OwnerType = Literal[
    "First Owner",
    "Second Owner",
    "Third Owner",
    "Fourth & Above Owner",
    "Test Drive Car",
]

MIN_YEAR = 1983
MAX_YEAR = 2026


class CarPredictionRequest(BaseModel):
    """All 13 features required by the trained model."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="ignore",
        json_schema_extra={
            "example": {
                "name": "Maruti Swift Dzire VDI",
                "year": 2014,
                "km_driven": 145500,
                "fuel": "Diesel",
                "seller_type": "Individual",
                "transmission": "Manual",
                "owner": "First Owner",
                "mileage": 23.4,
                "engine": 1248,
                "max_power": 74.0,
                "torque": "190Nm@ 2000rpm",
                "seats": 5,
            }
        },
    )

    name: str = Field(..., min_length=1, max_length=200, description="Car name / model")
    year: int = Field(..., ge=MIN_YEAR, le=MAX_YEAR, description="Manufacturing year")
    km_driven: int = Field(..., ge=0, le=5_000_000, description="Kilometers driven")
    fuel: FuelType
    seller_type: SellerType
    transmission: TransmissionType
    owner: OwnerType
    mileage: float | None = Field(None, ge=0, le=200, description="Mileage in kmpl")
    engine: float | None = Field(None, ge=0, le=10_000, description="Engine capacity in CC")
    max_power: float | None = Field(None, ge=0, le=2_000, description="Max power in BHP")
    torque: str = Field("", max_length=100, description="Torque specification")
    seats: float | None = Field(None, ge=0, le=20, description="Number of seats")

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Car name must not be empty")
        return value.strip()

    @field_validator("torque", mode="before")
    @classmethod
    def normalise_torque(cls, value: Any) -> str:
        if value is None:
            return ""
        return str(value).strip()


class CarDetails(BaseModel):
    """The input details echoed back to the client."""

    name: str
    year: int
    km_driven: int
    fuel: str
    seller_type: str
    transmission: str
    owner: str
    mileage: float | None = None
    engine: float | None = None
    max_power: float | None = None
    torque: str = ""
    seats: float | None = None
    car_age: int


class PredictionResponse(BaseModel):
    prediction_id: str
    predicted_price: float
    currency: Literal["INR"] = "INR"
    car_details: CarDetails
    created_at: datetime
    model_name: str | None = None
    disclaimer: str | None = None


class PredictionRecord(PredictionResponse):
    """A stored prediction document."""

    model_config = ConfigDict(populate_by_name=True)


class PredictionListResponse(BaseModel):
    items: list[PredictionRecord]
    total: int
    page: int
    page_size: int
    total_pages: int


class DashboardStats(BaseModel):
    total_predictions: int
    average_price: float
    highest_price: float
    lowest_price: float
    latest_price: float | None = None


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    model_loaded: bool
    model_path: str | None = None
    model_error: str | None = None
    database_connected: bool
    database_error: str | None = None
    dataset_loaded: bool
    dataset_rows: int = 0
