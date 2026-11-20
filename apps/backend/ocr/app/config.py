"""OCR service settings."""
import os


class Settings:
    # Confidence bands used when drawing the OCR overlay (green / amber / red).
    CONFIDENCE_HIGH: float = float(os.environ.get("OCR_CONFIDENCE_HIGH", "0.85"))
    CONFIDENCE_MEDIUM: float = float(os.environ.get("OCR_CONFIDENCE_MEDIUM", "0.60"))


settings = Settings()
