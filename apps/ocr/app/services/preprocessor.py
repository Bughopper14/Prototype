import os
import cv2
import pymupdf as fitz
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from typing import Tuple, List, Optional, Dict, Any
from app.config import settings

class DocumentPreprocessor:
    """Preprocesses documents (PDF or images) for optimal OCR quality."""

    @staticmethod
    def load_document(file_path: Path) -> Tuple[np.ndarray, int]:
        """
        Loads document. If PDF, renders first page at 300 DPI.
        Returns: (numpy image in BGR format, total page count)
        """
        file_ext = file_path.suffix.lower()
        if file_ext == ".pdf":
            doc = fitz.open(str(file_path))
            page_count = len(doc)
            if page_count == 0:
                raise ValueError("PDF document contains no pages.")
            
            # Render page 1 at 300 DPI (zoom 300/72 = 4.1667)
            page = doc[0]
            zoom = 300 / 72.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            
            # Convert pixmap to numpy array (RGB -> BGR for OpenCV)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
            img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            doc.close()
            return img_bgr, page_count
        else:
            # Standard image load
            img = cv2.imread(str(file_path))
            if img is None:
                # Fallback to PIL in case of special format
                pil_img = Image.open(str(file_path)).convert("RGB")
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            return img, 1

    @classmethod
    def auto_orient_image(cls, img: np.ndarray) -> Tuple[np.ndarray, int]:
        """
        Automatically detects if an image is sideways or upside-down
        (0°, 90° CW, 180°, 270° CW) and orients it upright for accurate OCR.
        Returns: (upright_image, angle_rotated)
        """
        from app.services.ocr_engine import OCREngine

        h, w = img.shape[:2]
        # Fast downscale for orientation detection
        scale = 640.0 / max(h, w)
        small = cv2.resize(img, (0, 0), fx=scale, fy=scale) if scale < 1.0 else img.copy()

        boxes0 = OCREngine.process_image(small)
        horiz0 = sum(1 for b in boxes0 if (b['x_max'] - b['x_min']) > (b['y_max'] - b['y_min']) * 1.3)

        # If already upright with clear horizontal text, return immediately (0ms extra work)
        if len(boxes0) > 0 and (horiz0 / len(boxes0) >= 0.75 and horiz0 >= 8):
            return img, 0

        # Test remaining 3 angles
        angles = [
            (None, 0, horiz0),
            (cv2.ROTATE_90_CLOCKWISE, 90, 0),
            (cv2.ROTATE_180, 180, 0),
            (cv2.ROTATE_90_COUNTERCLOCKWISE, 270, 0)
        ]

        scored_rotations = []
        for code, deg, initial_h in angles:
            if code is None:
                test_boxes = boxes0
                cur_test = small
            else:
                cur_test = cv2.rotate(small, code)
                test_boxes = OCREngine.process_image(cur_test)

            cur_h, cur_w = cur_test.shape[:2]
            h_count = 0
            header_score = 0
            for b in test_boxes:
                bw = b['x_max'] - b['x_min']
                bh = b['y_max'] - b['y_min']
                if bw > bh * 1.3:
                    h_count += 1
                txt = b['text'].upper()
                if b['y_min'] < 0.35 * cur_h and any(k in txt for k in ['PROVINSI', 'KABUPATEN', 'KOTA', 'REPUBLIK', 'INVOICE', 'FAKTUR', 'SURAT', 'LAMPIRAN']):
                    header_score += 10

            score = h_count + header_score
            scored_rotations.append((score, deg, code))

        best = max(scored_rotations, key=lambda x: x[0])
        best_score, best_deg, best_code = best

        if best_code is not None and best_score > horiz0 + 3:
            rotated_img = cv2.rotate(img, best_code)
            return rotated_img, best_deg

        return img, 0

    @staticmethod
    def deskew_image(img: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Detects skew angle and rotates the image to straighten text lines.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Invert colors and threshold
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Find all white pixels (text)
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) < 100:
            return img, 0.0

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle

        # If angle is minor, don't over-rotate to avoid blur
        if abs(angle) < 0.3 or abs(angle) > 40:
            return img, 0.0

        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
        )
        return rotated, float(angle)

    @staticmethod
    def enhance_contrast(img: np.ndarray) -> np.ndarray:
        """
        Applies CLAHE (Contrast Limited Adaptive Histogram Equalization)
        to normalize shadows and brighten dark scans.
        """
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        return enhanced

    @staticmethod
    def create_annotated_preview(
        img: np.ndarray,
        boxes: List[Dict[str, Any]],
        output_path: Path
    ) -> Path:
        """
        Renders clear bounding boxes and labels onto the image for visual verification.
        Uses soft semi-transparent highlights for professional UI appearance.
        """
        overlay = img.copy()
        output_img = img.copy()

        for idx, item in enumerate(boxes):
            box = item.get("box")  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            conf = item.get("confidence", 1.0)
            field = item.get("field_mapping")

            # Determine color based on confidence and field mapping
            if field:
                color = (255, 120, 0)      # Blue/Cyan highlight for matched key fields
                thickness = 2
            elif conf >= settings.CONFIDENCE_HIGH:
                color = (46, 204, 113)     # Emerald Green (Good)
                thickness = 1
            elif conf >= settings.CONFIDENCE_MEDIUM:
                color = (241, 196, 15)     # Amber Yellow (Check)
                thickness = 1
            else:
                color = (231, 76, 60)      # Crimson Red (Warning)
                thickness = 2

            if box and len(box) == 4:
                pts = np.array(box, np.int32).reshape((-1, 1, 2))
                # Fill semi-transparent polygon
                cv2.fillPoly(overlay, [pts], color)
                cv2.polylines(output_img, [pts], True, color, thickness)
                
                # Draw small ID badge at top-left
                pt0 = box[0]
                bx, by = int(pt0[0]), int(pt0[1])
                cv2.rectangle(output_img, (bx, max(0, by - 14)), (bx + 20, max(0, by)), color, -1)
                cv2.putText(
                    output_img,
                    str(idx + 1),
                    (bx + 2, max(10, by - 3)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.35,
                    (255, 255, 255),
                    1,
                    cv2.LINE_AA
                )

        # Blend 85% original with 15% transparent overlay
        cv2.addWeighted(overlay, 0.15, output_img, 0.85, 0, output_img)
        cv2.imwrite(str(output_path), output_img)
        return output_path
