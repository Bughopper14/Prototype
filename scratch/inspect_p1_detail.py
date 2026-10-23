import sys
import os
import re
sys.path.insert(0, r"C:\Users\reage\Documents\ChatGPT\OCR")
import pymupdf as fitz
import cv2
import numpy as np
from app.services.ocr_engine import OCREngine

doc = fitz.open("documents/testdocfap.pdf")
all_boxes = []
for p_idx in range(len(doc)):
    page = doc[p_idx]
    pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72), alpha=False)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    boxes = OCREngine.process_image(bgr)
    for b in boxes:
        b["page"] = p_idx + 1
        b["page_width"] = pix.w
        b["page_height"] = pix.h
        all_boxes.append(b)

# Print all boxes with y between 400 and 1400 on page 1
print("=== ALL BOXES Y 350..1400 ===")
p1 = [b for b in all_boxes if b.get('page') == 1]
for b in sorted(p1, key=lambda x: (min(pt[1] for pt in x['box']) if isinstance(x['box'][0], list) else x['box'][1])):
    raw_b = b["box"]
    bx = min(pt[0] for pt in raw_b) if isinstance(raw_b[0], (list, tuple)) else raw_b[0]
    by = min(pt[1] for pt in raw_b) if isinstance(raw_b[0], (list, tuple)) else raw_b[1]
    if 350 <= by <= 1400:
        print(f"y={int(by):4d}, x={int(bx):4d} : {b['text']}")
