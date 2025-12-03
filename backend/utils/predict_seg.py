from utils.variables import data_path, VOLUME_SLICES, IMG_SIZE
from utils.session import SESSION_STATE    # <-- new import
import nibabel as nib
import numpy as np
import cv2
import random
import os

from utils.UNet_2D import *


def get_selected_patient_path(samples_list, selected_sample):
    """
    Same function, no Streamlit here.
    """
    if selected_sample == 'Random patient':
        selected_sample = random.choice(samples_list[1:])

    patient_path = os.path.join(data_path, selected_sample).replace("\\", "/")
    return patient_path


def predict_btn_click(model, patient_path):
    """
    Flask version — executed when /predict endpoint is called.
    It updates the SESSION_STATE instead of st.session_state.
    """
    # Avoid redundant predictions
    if not SESSION_STATE.get("pred_gen_for_this_patient", False):

        predicted_seg = predict_segmentation(model, patient_path)

        # Store segmentation
        SESSION_STATE["pred_seg"] = predicted_seg

        # Prediction can now be displayed
        SESSION_STATE["pred_can_be_displayed"] = True

        # Mark segmentation as generated for this patient
        SESSION_STATE["pred_gen_for_this_patient"] = True

    return SESSION_STATE.get("pred_seg")


def predict_segmentation(model, patient_path):
    """
    Predict patient segmentation.
    """
    # Try to load files with .nii or .nii.gz extension
    t1ce_path = patient_path + '_t1ce.nii'
    flair_path = patient_path + '_flair.nii'
    
    # Try .nii.gz if .nii doesn't exist
    if not os.path.exists(t1ce_path):
        t1ce_path = t1ce_path + '.gz'
    if not os.path.exists(flair_path):
        flair_path = flair_path + '.gz'
    
    # Load modalities
    t1ce = nib.load(t1ce_path).get_fdata()
    flair = nib.load(flair_path).get_fdata()

    # Preprocess slices
    X = np.empty((VOLUME_SLICES, IMG_SIZE, IMG_SIZE, 2), dtype=np.float32)

    for j in range(VOLUME_SLICES):
        X[j, :, :, 0] = cv2.resize(flair[:, :, j], (IMG_SIZE, IMG_SIZE))
        X[j, :, :, 1] = cv2.resize(t1ce[:, :, j], (IMG_SIZE, IMG_SIZE))

    # Normalize
    X = X / np.max(X)

    # Predict
    return model.predict(X, verbose=0)


def patient_has_changed_update_token():
    """
    Flask version — called when frontend selects a new patient.
    """
    SESSION_STATE["patient_has_changed"] = True
    SESSION_STATE["pred_can_be_displayed"] = False
    SESSION_STATE["pred_gen_for_this_patient"] = False
