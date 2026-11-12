import os
import re
import cv2
import pymupdf as fitz
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from typing import Tuple, List, Optional, Dict, Any, Callable
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

    @staticmethod
    def orient_ktp_image(
        img: np.ndarray,
        ocr_fn: Callable[[np.ndarray], List[Dict[str, Any]]],
    ) -> Tuple[np.ndarray, int]:
        """Detects 90/180/270-degree rotated or upside-down e-KTP cards using box geometry and top/bottom label layout."""
        top_keys_re = re.compile(r'(?:PROVINSI|KABUPATEN|KOTA\b|NIK\b|NAMA\b|TEMPAT)', re.I)
        bot_keys_re = re.compile(r'(?:AGAMA|PERKAWINAN|PEKERJAAN|KEWARGANEGARAAN|BERLAKU)', re.I)
        label_keys_re = re.compile(
            r'^(?:NIK|Nama|Tempat|Jenis|Alamat|RT|Kel|Kec|Agama|Status|Peker|Kewarg|Berlaku)',
            re.I,
        )

        def score_upright(im: np.ndarray, boxes: List[Dict[str, Any]]) -> float:
            if not boxes:
                return -1e9
            ih, iw = im.shape[:2]
            horiz = sum(1 for b in boxes if (b['x_max'] - b['x_min']) >= (b['y_max'] - b['y_min']))
            vert = len(boxes) - horiz
            top_ys = [((b['y_min'] + b['y_max']) / 2) / ih for b in boxes if top_keys_re.search(b.get('text', ''))]
            bot_ys = [((b['y_min'] + b['y_max']) / 2) / ih for b in boxes if bot_keys_re.search(b.get('text', ''))]
            label_xs = [
                ((b['x_min'] + b['x_max']) / 2) / iw
                for b in boxes
                if label_keys_re.search((b.get('text') or '').strip())
            ]
            order_bonus = 0.0
            if top_ys and bot_ys:
                order_bonus = 10.0 if (sum(top_ys) / len(top_ys)) < (sum(bot_ys) / len(bot_ys)) else -10.0
            elif top_ys:
                order_bonus = 5.0 if (sum(top_ys) / len(top_ys)) < 0.55 else -5.0
            left_bonus = 0.0
            if label_xs:
                left_bonus = 8.0 if (sum(label_xs) / len(label_xs)) < 0.45 else -8.0
            avg_c = sum(float(b.get('confidence', 0.0)) for b in boxes) / len(boxes)
            return (horiz - vert) * 2.0 + order_bonus + left_bonus + avg_c

        boxes0 = ocr_fn(img)
        s0 = score_upright(img, boxes0)
        vert0 = sum(1 for b in boxes0 if (b['y_max'] - b['y_min']) > (b['x_max'] - b['x_min']) * 1.15)
        horiz0 = len(boxes0) - vert0
        if boxes0 and vert0 <= horiz0 and s0 >= 5.0:
            return img, 0

        best_img, best_s, best_deg = img, s0, 0
        for deg, code in [
            (90, cv2.ROTATE_90_CLOCKWISE),
            (270, cv2.ROTATE_90_COUNTERCLOCKWISE),
            (180, cv2.ROTATE_180),
        ]:
            rot = cv2.rotate(img, code)
            rs = score_upright(rot, ocr_fn(rot))
            if rs > best_s:
                best_s, best_img, best_deg = rs, rot, deg
        return best_img, best_deg

    @staticmethod
    def enhance_ktp_for_ocr(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray, int]:
        """Upscales small e-KTP crops and suppresses blue guilloche horizontal stripes without eroding black ink."""
        h, w = img.shape[:2]
        scale = 4 if min(h, w) < 250 else (2 if max(h, w) < 1000 else 1)
        work = (
            cv2.resize(img, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
            if scale > 1
            else img.copy()
        )
        # Black e-KTP ink is dark across B, G, R; cyan background stripes stay bright in max(B, G, R).
        max_bgr = np.max(work, axis=2)
        kw = max(15, int(7 * scale) | 1)
        k_dil = cv2.getStructuringElement(cv2.MORPH_RECT, (kw, 1))
        bg = cv2.GaussianBlur(
            cv2.dilate(max_bgr, k_dil).astype(np.float32),
            (max(41, (kw * 3) | 1), 1),
            0,
        )
        diff = np.maximum(0.0, bg - max_bgr.astype(np.float32))
        clean_gray = np.clip(255.0 - diff * 2.0, 0, 255).astype(np.uint8)
        return cv2.cvtColor(clean_gray, cv2.COLOR_GRAY2BGR), clean_gray, scale

    @staticmethod
    def refine_ktp_box_spacing(
        clean_gray: np.ndarray,
        boxes: List[Dict[str, Any]],
        ocr_engine: Any,
    ) -> List[Dict[str, Any]]:
        """Re-recognizes KTP text boxes whose spaces were collapsed by splitting at visual word gaps."""
        if not boxes or ocr_engine is None:
            return boxes

        h, w = clean_gray.shape[:2]
        for box in boxes:
            orig_text = str(box.get("text") or "").strip()
            orig_conf = float(box.get("confidence") or 0.0)
            if not orig_text or re.fullmatch(r'[\d/\-:.\s]+', orig_text):
                continue
            # Only split boxes missing spaces or containing long glued alphanumeric runs
            if ' ' in orig_text and not re.search(r'[A-Za-z0-9]{9,}', orig_text):
                continue

            x1, y1 = max(0, int(box['x_min']) - 2), max(0, int(box['y_min']) - 2)
            x2, y2 = min(w, int(box['x_max']) + 2), min(h, int(box['y_max']) + 2)
            roi = clean_gray[y1:y2, x1:x2]
            if roi.size == 0 or roi.shape[0] < 8 or roi.shape[1] < 16:
                continue

            roi_h, roi_w = roi.shape[:2]
            up_f = 2 if roi_h < 42 else 1
            work_roi = (
                cv2.resize(roi, (roi_w * up_f, roi_h * up_f), interpolation=cv2.INTER_LANCZOS4)
                if up_f > 1
                else roi
            )
            _, bw = cv2.threshold(work_roi, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            row_ink = (bw > 0).sum(axis=1)
            nz_rows = np.where(row_ink >= 2)[0]
            if len(nz_rows) < 4:
                continue

            glyph_h = max(8, int(nz_rows[-1] - nz_rows[0] + 1))
            col_ink = (bw[nz_rows[0]:nz_rows[-1] + 1, :] > 0).sum(axis=0)
            min_gap = max(4, int(glyph_h * 0.24))

            spans: List[Tuple[int, int]] = []
            cur_s = None
            zero_run = 0
            for xi, cnt in enumerate(col_ink):
                if cnt >= 2:
                    if cur_s is None:
                        cur_s = xi
                    zero_run = 0
                elif cur_s is not None:
                    zero_run += 1
                    if zero_run >= min_gap:
                        spans.append((cur_s, xi - zero_run + 1))
                        cur_s = None
                        zero_run = 0
            if cur_s is not None:
                spans.append((cur_s, len(col_ink) - zero_run))

            spans = [(s, e) for s, e in spans if e - s >= 4]
            if len(spans) <= 1:
                continue

            words_out: List[str] = []
            confs: List[float] = []
            for ws, we in spans:
                wcrop = work_roi[:, max(0, ws - 4):min(work_roi.shape[1], we + 4)]
                pad = cv2.copyMakeBorder(wcrop, 12, 12, 16, 16, cv2.BORDER_CONSTANT, value=255)
                rec_res, _ = ocr_engine.text_recognizer([cv2.cvtColor(pad, cv2.COLOR_GRAY2BGR)])
                if rec_res and rec_res[0][0]:
                    words_out.append(str(rec_res[0][0]).strip())
                    confs.append(float(rec_res[0][1]))

            if len(words_out) >= 2 and confs:
                avg_c = sum(confs) / len(confs)
                if avg_c >= max(0.65, orig_conf - 0.14):
                    box["text"] = " ".join(w_tok for w_tok in words_out if w_tok)
                    box["confidence"] = round(avg_c, 4)

        return boxes
