"""
Helper functions for image processing operations used across multiple routes.
"""
import numpy as np
import cv2
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from typing import Tuple, Callable

CLASS_COLOR_MAP = {
    1: "#f6a9c4",  # Non-enhancing tumor
    2: "#c58b57",  # Edema
    3: "#8abed8",  # Enhancing tumor
}


def normalize_image_slice(slice_data: np.ndarray) -> np.ndarray:
    """Normalize image slice to 0-255 range for display."""
    slice_data = np.nan_to_num(slice_data)
    return ((slice_data - slice_data.min()) / (slice_data.max() - slice_data.min() + 1e-8) * 255).astype(np.uint8)


def filter_prediction_by_class(pred_slice: np.ndarray, selected_class: str) -> np.ndarray:
    """Filter prediction mask based on selected class."""
    if selected_class == "All":
        return pred_slice
    elif selected_class == "None":
        return np.zeros_like(pred_slice)
    else:
        class_value = int(selected_class)
        return np.where(pred_slice == class_value, pred_slice, 0)


def create_segmentation_colormap() -> Tuple[mcolors.ListedColormap, mcolors.BoundaryNorm]:
    """Create colormap and normalization for segmentation overlay."""
    multi_cmap = mcolors.ListedColormap(
        ["#00000000", CLASS_COLOR_MAP[1], CLASS_COLOR_MAP[2], CLASS_COLOR_MAP[3]]
    )
    multi_norm = mcolors.BoundaryNorm([-0.5, 0.5, 1.5, 2.5, 3.5], multi_cmap.N)
    return multi_cmap, multi_norm


def extract_slice_by_plane(img: np.ndarray, pred_vol: np.ndarray, plane: str, slice_idx: int) -> Tuple[np.ndarray, np.ndarray]:
    """Extract image and prediction slices based on plane and index."""
    if plane == "Axial":
        max_idx = img.shape[2]
        slice_idx = int(np.clip(slice_idx, 0, max_idx - 1))
        slice_img = img[:, :, slice_idx]
        pred_slice_idx = int(np.clip(slice_idx, 0, pred_vol.shape[2] - 1))
        slice_pred = pred_vol[:, :, pred_slice_idx]
    elif plane == "Sagittal":
        max_idx = img.shape[0]
        slice_idx = int(np.clip(slice_idx, 0, max_idx - 1))
        slice_img = np.rot90(img[slice_idx, :, :])
        pred_slice_idx = int(np.clip(slice_idx, 0, pred_vol.shape[0] - 1))
        slice_pred = np.rot90(pred_vol[pred_slice_idx, :, :])
    else:  # Coronal
        max_idx = img.shape[1]
        slice_idx = int(np.clip(slice_idx, 0, max_idx - 1))
        slice_img = np.rot90(img[:, slice_idx, :])
        pred_slice_idx = int(np.clip(slice_idx, 0, pred_vol.shape[1] - 1))
        slice_pred = np.rot90(pred_vol[:, pred_slice_idx, :])
    
    # Ensure shapes match
    if slice_pred.shape != slice_img.shape:
        slice_pred = cv2.resize(
            slice_pred.astype(np.float32),
            (slice_img.shape[1], slice_img.shape[0]),
            interpolation=cv2.INTER_NEAREST
        ).astype(np.int16)
    
    return slice_img, slice_pred


def create_slicer_function(img: np.ndarray, pred_vol: np.ndarray, plane: str) -> Tuple[int, Callable]:
    """Create a slicer function for GIF generation based on plane."""
    if plane == "Axial":
        num_slices = img.shape[2]
        slicer = lambda i: (img[:, :, i], pred_vol[:, :, i])
    elif plane == "Sagittal":
        num_slices = img.shape[0]
        slicer = lambda i: (np.rot90(img[i, :, :]), np.rot90(pred_vol[i, :, :]))
    else:  # Coronal
        num_slices = img.shape[1]
        slicer = lambda i: (np.rot90(img[:, i, :]), np.rot90(pred_vol[:, i, :]))
    
    return num_slices, slicer


def get_gif_animation_params(plane: str, num_slices: int) -> Tuple[int, int]:
    """Get stride and fps parameters for GIF animation based on plane."""
    if plane == "Axial":
        stride = max(1, num_slices // 60)
        fps = 15
    else:  # Sagittal or Coronal
        stride = max(1, num_slices // 100)
        fps = 13
    return stride, fps


def render_slice_with_overlay(
    slice_img: np.ndarray,
    slice_pred: np.ndarray,
    figsize: Tuple[int, int] = (6, 6),
    dpi: int = 100
) -> plt.Figure:
    """Render a slice with prediction overlay on black background."""
    fig, ax = plt.subplots(figsize=figsize, facecolor="black")
    ax.set_facecolor("black")
    
    # Normalize and display image
    slice_img_normalized = normalize_image_slice(slice_img)
    ax.imshow(slice_img_normalized, cmap="gray", vmin=0, vmax=255)
    
    # Overlay prediction mask if there are non-zero predictions
    if not np.all(slice_pred == 0):
        cmap, norm = create_segmentation_colormap()
        mask_show = np.ma.masked_where(slice_pred == 0, slice_pred)
        ax.imshow(mask_show, cmap=cmap, norm=norm, alpha=0.75, interpolation="nearest")
    
    ax.axis("off")
    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    
    return fig

