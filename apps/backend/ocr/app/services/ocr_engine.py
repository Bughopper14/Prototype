"""
RapidOCR (ONNX PaddleOCR) engine wrapper with automatic GPU/CPU provider selection.

GPU Acceleration Setup (run inside apps/backend/ocr/.venv):
  1. Windows GPU (NVIDIA / AMD / Intel via DirectML — no CUDA Toolkit required):
       .venv\\Scripts\\python.exe -m pip uninstall -y onnxruntime
       .venv\\Scripts\\python.exe -m pip install onnxruntime-directml

  2. NVIDIA CUDA GPU (Linux or Windows with CUDA Toolkit + cuDNN installed):
       .venv/bin/python -m pip uninstall -y onnxruntime
       .venv/bin/python -m pip install onnxruntime-gpu

  3. CPU only (default fallback when no GPU wheel is installed):
       pip install onnxruntime

Env configuration:
  OCR_DEVICE=auto   (default: CUDA -> DirectML -> CPU)
  OCR_DEVICE=dml    (force DirectML, falls back to CPU if unavailable)
  OCR_DEVICE=cuda   (force CUDA, falls back to CPU if unavailable)
  OCR_DEVICE=cpu    (force CPU)
  OCR_THREADS=<n>   (optional CPU thread cap per worker)
"""
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
    def _resolve_device_kwargs(cls) -> Dict[str, Any]:
        """
        Resolves GPU/CPU acceleration from OCR_DEVICE env var:
        - 'auto' (default): uses CUDA if CUDAExecutionProvider is available, else DirectML if DmlExecutionProvider is available, else CPU.
        - 'cuda' / 'dml' / 'cpu': forces the requested provider (falls back to CPU if unavailable).
        """
        mode = (os.environ.get("OCR_DEVICE", "auto") or "auto").strip().lower()
        if mode == "cpu":
            return {}
        try:
            import onnxruntime as ort
            providers = set(ort.get_available_providers())
        except Exception:
            providers = set()

        if mode in ("auto", "cuda") and "CUDAExecutionProvider" in providers:
            return {"det_use_cuda": True, "cls_use_cuda": True, "rec_use_cuda": True}
        if mode in ("auto", "dml", "directml") and "DmlExecutionProvider" in providers:
            return {"det_use_dml": True, "cls_use_dml": True, "rec_use_dml": True}
        return {}

    @classmethod
    def get_engine(cls) -> RapidOCR:
        if cls._instance is None:
            # Several workers run side by side, so each one gets its own share of the cores (OCR_THREADS); without it every worker starts a thread
            # per core and they slow each other down.
            kwargs: Dict[str, Any] = cls._resolve_device_kwargs()
            threads = int(os.environ.get("OCR_THREADS", "0") or 0)
            if threads > 0:
                cv2.setNumThreads(threads)
                kwargs.update(intra_op_num_threads=threads, inter_op_num_threads=1)
            cls._instance = RapidOCR(**kwargs)
        return cls._instance

    @classmethod
    def process_image(cls, img: np.ndarray, use_cls: bool = True, use_det: bool = True) -> List[Dict[str, Any]]:
        """
        Processes a numpy image array (BGR).
        Returns a list of detected bounding boxes with text and confidence scores.
        Set use_cls=False for already-aligned upright pages to avoid 180-deg misclassification.
        Set use_det=False for single-line cell crops (recognition-only, ~15ms/cell).
        """
        engine = cls.get_engine()
        results, elapse = engine(img, use_det=use_det, use_cls=use_cls, use_rec=True)

        parsed_boxes: List[Dict[str, Any]] = []
        if not results:
            return parsed_boxes

        if not use_det:
            # RapidOCR with use_det=False returns [(text, conf), ...]
            h, w = img.shape[:2]
            for idx, item in enumerate(results):
                text = str(item[0]).strip() if item else ""
                try:
                    conf = float(item[1]) if len(item) > 1 else 0.85
                except (ValueError, TypeError):
                    conf = 0.85
                parsed_boxes.append({
                    "id": idx + 1,
                    "text": text,
                    "confidence": round(conf, 4),
                    "box": [[0, 0], [w, 0], [w, h], [0, h]],
                    "x_min": 0.0,
                    "y_min": 0.0,
                    "x_max": float(w),
                    "y_max": float(h),
                    "field_mapping": None,
                })
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
