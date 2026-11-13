"""Async MongoDB access layer built on Motor."""

from __future__ import annotations

import logging
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)


class Database:
    """Thin wrapper that owns the Mongo client and exposes the collection."""

    def __init__(self) -> None:
        self._client: AsyncIOMotorClient | None = None
        self._error: str | None = None

    @property
    def client(self) -> AsyncIOMotorClient | None:
        return self._client

    @property
    def error(self) -> str | None:
        return self._error

    def get_db(self) -> AsyncIOMotorDatabase:
        if self._client is None:
            raise RuntimeError("MongoDB client has not been initialised.")
        return self._client[settings.mongo_db_name]

    @property
    def collection(self):
        return self.get_db()[settings.mongo_collection]

    async def connect(self) -> bool:
        """Create the client and verify connectivity with a ping."""
        try:
            self._client = AsyncIOMotorClient(
                settings.mongo_uri,
                serverSelectionTimeoutMS=settings.mongo_timeout_ms,
                connectTimeoutMS=settings.mongo_timeout_ms,
            )
            await self._client.admin.command("ping")
            self._error = None
            await self.ensure_indexes()
            logger.info("Connected to MongoDB at %s", settings.mongo_uri)
            return True
        except Exception as exc:
            self._error = str(exc)
            logger.warning("MongoDB connection failed: %s", exc)
            return False

    async def ensure_indexes(self) -> None:
        """Create indexes that support the history and dashboard queries."""
        collection = self.collection
        await collection.create_index("prediction_id", unique=True)
        await collection.create_index([("created_at", -1)])
        await collection.create_index([("car_details.fuel", 1)])
        await collection.create_index([("predicted_price", 1)])
        await collection.create_index([("car_details.name", 1)])

    async def normalize_created_at(self) -> int:
        """Rewrite legacy ISO-string ``created_at`` values as real datetimes.

        MongoDB compares across BSON types first, so one string timestamp
        sorts away from every date (breaking ``latest``/history ordering)
        and crashes any code calling ``strftime`` on it.  Returns the number
        of records repaired.
        """
        from app.utils.time_utils import to_datetime

        collection = self.collection
        repaired = 0
        async for doc in collection.find(
            {"created_at": {"$type": "string"}}, {"created_at": 1}
        ):
            moment = to_datetime(doc.get("created_at"))
            if moment is None:
                logger.warning(
                    "Unparseable created_at on prediction %s: %r",
                    doc.get("_id"),
                    doc.get("created_at"),
                )
                continue
            await collection.update_one(
                {"_id": doc["_id"]}, {"$set": {"created_at": moment}}
            )
            repaired += 1

        if repaired:
            logger.info("Normalized created_at on %d prediction record(s)", repaired)
        return repaired

    @property
    def is_connected(self) -> bool:
        return self._client is not None and self._error is None

    async def ping(self) -> bool:
        if self._client is None:
            return False
        try:
            await self._client.admin.command("ping")
            return True
        except Exception as exc:
            self._error = str(exc)
            return False

    async def close(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None


database = Database()


async def get_database() -> Database:
    """FastAPI dependency returning the shared database handle."""
    return database
