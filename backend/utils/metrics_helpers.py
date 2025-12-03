"""
Helper functions for calculating segmentation metrics.
"""
import numpy as np
from typing import Dict, Any


def calculate_class_metrics(pred_vol: np.ndarray, voxel_volume_mm3: float) -> Dict[int, Dict[str, Any]]:
    """Calculate metrics for each tumor class."""
    total_voxels = pred_vol.size
    class_metrics = {}
    
    for class_id in [1, 2, 3]:
        class_mask = (pred_vol == class_id)
        class_voxels = np.sum(class_mask)
        class_volume_mm3 = class_voxels * voxel_volume_mm3
        class_percentage = (class_voxels / total_voxels * 100) if total_voxels > 0 else 0
        
        class_metrics[class_id] = {
            "voxel_count": int(class_voxels),
            "volume_mm3": round(class_volume_mm3, 2),
            "volume_cm3": round(class_volume_mm3 / 1000, 2),
            "percentage": round(class_percentage, 2)
        }
    
    return class_metrics


def calculate_total_tumor_metrics(pred_vol: np.ndarray, voxel_volume_mm3: float) -> Dict[str, Any]:
    """Calculate total tumor volume metrics (all classes combined)."""
    total_voxels = pred_vol.size
    tumor_mask = (pred_vol > 0)
    total_tumor_voxels = np.sum(tumor_mask)
    total_tumor_volume_mm3 = total_tumor_voxels * voxel_volume_mm3
    total_tumor_percentage = (total_tumor_voxels / total_voxels * 100) if total_voxels > 0 else 0
    
    return {
        "voxel_count": int(total_tumor_voxels),
        "volume_mm3": round(total_tumor_volume_mm3, 2),
        "volume_cm3": round(total_tumor_volume_mm3 / 1000, 2),
        "percentage": round(total_tumor_percentage, 2)
    }


def get_class_explanations() -> Dict[str, Dict[str, str]]:
    """Get clinical explanations for each tumor class."""
    return {
        "1": {
            "name": "Non-Enhancing Tumor",
            "description": "Represents the necrotic and non-enhancing core of the tumor. This region typically shows low signal intensity on contrast-enhanced T1-weighted images and may indicate areas of cell death or poor vascularization.",
            "clinical_significance": "Non-enhancing regions often correlate with necrotic tissue and may indicate tumor progression or treatment response."
        },
        "2": {
            "name": "Peritumoral Edema",
            "description": "Represents the edematous/infiltrated tissue surrounding the tumor. This region appears hyperintense on FLAIR images and indicates fluid accumulation and tissue swelling around the tumor mass.",
            "clinical_significance": "Edema extent is important for surgical planning and can indicate the aggressiveness of the tumor. Larger edema volumes may suggest more invasive tumor behavior."
        },
        "3": {
            "name": "Enhancing Tumor",
            "description": "Represents the actively enhancing portion of the tumor, typically the most vascularized and metabolically active region. This area shows strong contrast enhancement on T1-weighted post-contrast images.",
            "clinical_significance": "The enhancing tumor core is often the primary target for surgical resection and radiation therapy. Its size and location are critical for treatment planning."
        },
        "All": {
            "name": "Complete Tumor Segmentation",
            "description": "Shows all tumor components combined: non-enhancing core, peritumoral edema, and enhancing tumor. This provides a comprehensive view of the entire tumor burden.",
            "clinical_significance": "Total tumor volume is a key prognostic factor and helps assess overall disease burden and treatment response over time."
        }
    }


def get_selected_class_metrics(class_metrics: Dict[int, Dict[str, Any]], selected_class: str) -> Dict[str, Any] | None:
    """Get metrics for a specific selected class."""
    if selected_class in ["All", "None", "0"]:
        return None
    
    try:
        class_id = int(selected_class)
        return class_metrics.get(class_id)
    except ValueError:
        return None

