from utils.interface_tumor import *
import streamlit as st
from utils.utils import init_session_state_variables, dataset_unzip, rename_wrong_file, check_if_dataset_exists
from utils.UNet_2D import init_model
from utils.variables import data_path

def init_app():
    """
    App Configuration
    This functions sets & display the app title, its favicon, initialize some session_state values).
    It also verifies that the dataset exists in the environment and well unzipped.
    """

    # Set config and app title
    st.set_page_config(page_title="Image Segmentation", layout="wide", page_icon="🧠")
    st.title("Brain Tumors Segmentation 🧠")
    
    # Application Description
    st.write("""
    This application is designed to perform brain tumor segmentation on MRI images. 
    The app allows users to visualize ground truth segmentation, predicted segmentation, and explore 
    multiple modalities (T1, T1CE, T2, FLAIR) for better analysis. 
    Users can upload their data and visualize the results with easy-to-use controls and post-processing features.
    """)


    # Initialize session state variables
    init_session_state_variables()

    # Unzip dataset if not already done
    dataset_unzip()

    # Rename the 355th file if necessary (it has a default incorrect name)
    rename_wrong_file(data_path)

    # Check if the dataset exists in the environment to know if we can launch the app
    check_if_dataset_exists()

    # Create & compile the CNN (U-Net model)
    model = init_model()

    return model


if __name__ == '__main__':
    model = init_app()
    launch_app(model)
