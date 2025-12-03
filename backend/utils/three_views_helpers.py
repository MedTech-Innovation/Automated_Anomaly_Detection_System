"""
Helper functions for three-view visualization.
"""
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from typing import Tuple, List
from utils.image_processing_helpers import CLASS_COLOR_MAP, normalize_image_slice, filter_prediction_by_class, create_segmentation_colormap


def extract_three_view_slices(
    img: np.ndarray,
    pred_vol: np.ndarray,
    voxel_coords: np.ndarray
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Extract sagittal, coronal, and axial slices from image and prediction volumes."""
    x_idx = int(np.clip(voxel_coords[0], 0, img.shape[0] - 1))
    y_idx = int(np.clip(voxel_coords[1], 0, img.shape[1] - 1))
    z_idx = int(np.clip(voxel_coords[2], 0, img.shape[2] - 1))
    
    sagittal_img = np.rot90(img[x_idx, :, :])
    sagittal_pred = np.rot90(pred_vol[x_idx, :, :])
    coronal_img = np.rot90(img[:, y_idx, :])
    coronal_pred = np.rot90(pred_vol[:, y_idx, :])
    axial_img = img[:, :, z_idx]
    axial_pred = pred_vol[:, :, z_idx]
    
    return sagittal_img, sagittal_pred, coronal_img, coronal_pred, axial_img, axial_pred


def calculate_crosshair_positions(
    sagittal_shape: Tuple[int, int],
    coronal_shape: Tuple[int, int],
    axial_shape: Tuple[int, int],
    x_idx: int,
    y_idx: int,
    z_idx: int
) -> Tuple[Tuple[int, int], Tuple[int, int], Tuple[int, int]]:
    """Calculate crosshair positions for each view."""
    sag_cross = (
        int(np.clip(sagittal_shape[0] - z_idx - 1, 0, sagittal_shape[0] - 1)),
        int(np.clip(y_idx, 0, sagittal_shape[1] - 1)),
    )
    cor_cross = (
        int(np.clip(coronal_shape[0] - z_idx - 1, 0, coronal_shape[0] - 1)),
        int(np.clip(x_idx, 0, coronal_shape[1] - 1)),
    )
    axial_cross = (
        int(np.clip(y_idx, 0, axial_shape[0] - 1)),
        int(np.clip(x_idx, 0, axial_shape[1] - 1)),
    )
    return sag_cross, cor_cross, axial_cross


def render_three_views(
    views: List[Tuple[str, np.ndarray, np.ndarray, Tuple[int, int], str]],
    coords: dict
) -> plt.Figure:
    """Render three orthogonal views with crosshairs and labels."""
    cmap, norm = create_segmentation_colormap()
    
    fig, axes = plt.subplots(1, 3, figsize=(15, 5), facecolor="black")
    fig.subplots_adjust(wspace=0.03, hspace=0)
    
    for ax, (title, image_slice, pred_slice, crosshair_pos, label) in zip(axes, views):
        ax.set_facecolor("black")
        ax.imshow(image_slice, cmap="gray", vmin=0, vmax=255)
        
        mask_show = np.ma.masked_where(pred_slice == 0, pred_slice)
        if mask_show.count() > 0:
            ax.imshow(mask_show, cmap=cmap, norm=norm, alpha=0.75, interpolation="nearest")
        
        h, w = image_slice.shape
        ax.axhline(crosshair_pos[0], color="white", linewidth=0.8, alpha=0.7)
        ax.axvline(crosshair_pos[1], color="white", linewidth=0.8, alpha=0.7)
        ax.set_title(title, color="white", fontsize=12, pad=8)
        ax.text(
            0.5, -0.05, label,
            transform=ax.transAxes,
            color="white", fontsize=10,
            horizontalalignment="center",
        )
        
        if title in ["Sagittal", "Coronal"]:
            ax.text(0.02, 0.98, "L", transform=ax.transAxes, color="white",
                   fontsize=11, fontweight="bold", verticalalignment="top")
            ax.text(0.98, 0.98, "R", transform=ax.transAxes, color="white",
                   fontsize=11, fontweight="bold", verticalalignment="top",
                   horizontalalignment="right")
        ax.axis("off")
    
    return fig

