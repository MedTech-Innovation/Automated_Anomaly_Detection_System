import io
import matplotlib as mpl
import os
import zipfile

from flask import send_file
from matplotlib import pyplot as plt
from matplotlib.colors import ListedColormap
from utils.variables import data_path

SESSION_STATE = {}


def init_session_state_variables():
    """
    Initialize session-like variables using a dictionary rather than streamlit
    """
    SESSION_STATE.setdefault("pred_seg", None)
    SESSION_STATE.setdefault("patient_path", None)
    SESSION_STATE.setdefault("patient_has_changed", True)
    SESSION_STATE.setdefault("pred_can_be_displayed", False)
    SESSION_STATE.setdefault("pred_gen_for_this_patient", False)


def get_key_from_dict(modality_dict, val):
    for key, value in modality_dict.items():
        if val == value:
            return key


def dataset_unzip():
    """
    Unzip dataset using basic python, no spinner
    """
    path_to_zip_file = "C:/Users/Home/Downloads/BraTS2020_TrainingData.zip"
    target_dir = "C:/Users/Home/Downloads/BraTS2020_TrainingData"

    print("Checking dataset...")

    if not os.path.exists(target_dir):
        print("Unzipping dataset...")
        with zipfile.ZipFile(path_to_zip_file, 'r') as zip_ref:
            zip_ref.extractall(target_dir)
        print("Unzip complete.")
    else:
        print("Dataset already extracted.")


def rename_wrong_file(dataset_path):
    old_name = dataset_path + "/BraTS20_Training_355/W39_1998.09.19_Segm.nii"
    new_name = dataset_path + "/BraTS20_Training_355/BraTS20_Training_355_seg.nii"

    if os.path.exists(old_name):
        os.rename(old_name, new_name)
        print("Fixed wrong file name.")


def check_if_dataset_exists():
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Cannot start backend.")


def create_colormap():
    my_cmap = mpl.colors.ListedColormap(['#440054', '#3b528b', '#18b880', '#e6d74f'])
    my_norm = mpl.colors.BoundaryNorm([-0.5, 0.5, 1.5, 2.5, 3.5], my_cmap.N)
    class_names = ['class 0', 'class 1', 'class 2', 'class 3']
    legend = [plt.Rectangle((0, 0), 1, 1, color=my_cmap(i), label=class_names[i]) for i in range(len(class_names))]
    return my_cmap, my_norm, legend


def fig_to_file(fig):
    """
    Convert matplotlib figure → BytesIO so Flask route can send it
    """
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    buf.seek(0)
    return buf


def download_file(fig, filename):
    """
    Flask version: returns a PNG file response
    """
    buf = fig_to_file(fig)
    return send_file(
        buf,
        mimetype="image/png",
        as_attachment=True,
        download_name=filename
    )
