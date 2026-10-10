import os
from pathlib import Path

REPOSITORY_DIRECTORY = Path(__file__).resolve().parents[1]
LIBRARY_DIRECTORY = Path(os.environ.get('FIRELANDS_PROJECT_DIR') or REPOSITORY_DIRECTORY.parent.parent / 'Projects' / 'firelands-current').resolve()


def editorial_directory(date: str) -> Path:
    return LIBRARY_DIRECTORY / 'editorial' / date


def campaign_directory(date: str) -> Path:
    return LIBRARY_DIRECTORY / 'ad-creatives' / date
