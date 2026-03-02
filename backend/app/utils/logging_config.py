import logging
import sys

from app.config import settings


def setup_logging():
    fmt = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(stream=sys.stdout, level=level, format=fmt, force=True)
