import logging
import sys


def setup_logging():
    fmt = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
    logging.basicConfig(stream=sys.stdout, level=logging.INFO, format=fmt, force=True)
