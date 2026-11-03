import os
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional
from rapidocr_onnxruntime import RapidOCR
from app.config import settings

class OCREngine:
    """
    High-performance OCR Engine powered by RapidOCR (ONNX PaddleOCR).
    Runs offline on CPU/GPU with high accuracy and bounding-box coordinates.
    """
    _instance: Optional[RapidOCR] = None

    @classmethod
    def get_engine(cls) -> RapidOCR:
        if cls._instance is None:
            cls._instance = RapidOCR()
        return cls._instance

    @classmethod
    def process_image(cls, img: np.ndarray) -> List[Dict[str, Any]]:
        """
        Processes a numpy image array (BGR).
        Returns a list of detected bounding boxes with text and confidence scores.
        """
        engine = cls.get_engine()
        results, elapse = engine(img)

        parsed_boxes: List[Dict[str, Any]] = []
        if not results:
            return parsed_boxes

        for idx, item in enumerate(results):
            # item structure: [box_points, text, confidence]
            box_points = item[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            text = str(item[1]).strip()
            
            # Confidence can be string or float
            try:
                conf = float(item[2])
            except (ValueError, TypeError):
                conf = 0.85

            # Calculate bounding limits
            xs = [pt[0] for pt in box_points]
            ys = [pt[1] for pt in box_points]
            x_min, x_max = float(min(xs)), float(max(xs))
            y_min, y_max = float(min(ys)), float(max(ys))

            parsed_boxes.append({
                "id": idx + 1,
                "text": text,
                "confidence": round(conf, 4),
                "box": box_points,
                "x_min": x_min,
                "y_min": y_min,
                "x_max": x_max,
                "y_max": y_max,
                "field_mapping": None
            })

        return parsed_boxes
