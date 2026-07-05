# backend/celery_app.py
from celery import Celery
from app.core.config import settings

# Initialize Celery using the Redis URL from our configuration
celery_instance = Celery(
    "lexa_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# FIXED: Call autodiscover_tasks directly on the instance, not on .conf
celery_instance.autodiscover_tasks(["app.workers"])

# General Celery optimizations
celery_instance.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
)