from utils.utils import (
    init_session_state_variables,
    dataset_unzip,
    rename_wrong_file,
    check_if_dataset_exists,
    get_key_from_dict,
    create_colormap
)

from utils.UNet_2D import init_model
from utils.variables import data_path, samples_test, modalities_dict
from utils.img_processing import (
    modality_and_ground_truth_processing,
    predicted_seg_processing,
    resize_predicted_seg,
)
from utils.predict_seg import patient_has_changed_update_token, get_selected_patient_path, predict_btn_click


import nibabel as nib
import matplotlib.pyplot as plt
import numpy as np
import base64
import io
import cv2
import os
from flask_cors import CORS
import imageio

def get_modality_file(patient_path, modality):
    patient_name = os.path.basename(os.path.normpath(patient_path))

    suffix = {
        "FLAIR": "_flair.nii",
        "T1": "_t1.nii",
        "T1c": "_t1ce.nii",
        "T2": "_t2.nii",
        "SEG": "_seg.nii",
    }

    file_path = os.path.join(patient_path, patient_name + suffix[modality])

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    return file_path

def get_gif(patient_path, modality, plane):
     # Load modality volume
    modality_file = get_modality_file(patient_path, modality)
    img = nib.load(modality_file).get_fdata()  # (H, W, Z)

    # Compute / retrieve model prediction once per patient
    patient_name = os.path.basename(os.path.normpath(patient_path))
    patient_root = os.path.join(patient_path, patient_name)
    pred_raw = predict_btn_click(model, patient_root)              # (155, IMG_SIZE, IMG_SIZE, 4)
    pred_resized = resize_predicted_seg(pred_raw)                  # (155, 240, 240, 4)
    pred_classes = np.argmax(pred_resized, axis=3).astype(np.int16)  # (155, 240, 240)
    pred_vol = np.moveaxis(pred_classes, 0, 2)                     # (240, 240, 155) like nib layout

    # Choose slicing axis based on plane
    if plane == "Axial":
        num_slices = img.shape[2]
        slicer = lambda i: (img[:, :, i], pred_vol[:, :, i])
    elif plane == "Sagittal":
        num_slices = img.shape[0]
        slicer = lambda i: (np.rot90(img[i, :, :]), np.rot90(pred_vol[i, :, :]))
    else:  # Coronal
        num_slices = img.shape[1]
        slicer = lambda i: (np.rot90(img[:, i, :]), np.rot90(pred_vol[:, i, :]))

    # Sample slices (more frames => slower sweep).
    # Axial can move a bit faster; sagittal/coronal get more frames for smoother, slower motion.
    if plane == "Axial":
        stride = max(1, num_slices // 60)
        fps = 15
    else:  # Sagittal or Coronal
        stride = max(1, num_slices // 100)
        fps = 13
    idxs = range(0, num_slices, stride)

    frames = []
    # Target size for all frames to keep GIF smooth and lightweight
    target_h, target_w = 256, 256

    for idx in idxs:
        slice_img, slice_gt = slicer(idx)

        fig, ax = plt.subplots(figsize=(4, 4), facecolor="black")
        ax.set_facecolor("black")
        ax.imshow(slice_img, cmap="gray")
        mask_show = np.ma.masked_where(slice_gt == 0, slice_gt)
        ax.imshow(mask_show, cmap="jet", alpha=0.4, interpolation="none")
        ax.axis("off")
        plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
        fig.canvas.draw()

        frame = np.asarray(fig.canvas.renderer.buffer_rgba())[..., :3]
        # Resize every frame to the same resolution for perfectly smooth animation
        frame = cv2.resize(frame, (target_w, target_h))

        frames.append(frame)
        plt.close(fig)

    if len(frames) == 0:
        return jsonify({
            "gif": None,
            "error": f"GIF debug: No frames generated. num_slices={num_slices}"
        }), 500

    gif_bytes = io.BytesIO()
    # loop=0 → infinite looping GIF
    imageio.mimsave(gif_bytes, frames, format="GIF", fps=fps, loop=0)
    gif_bytes.seek(0)
    encoded_gif = base64.b64encode(gif_bytes.read()).decode("utf-8")

    return jsonify({"gif": encoded_gif})