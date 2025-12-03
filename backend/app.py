from flask import Flask, request, jsonify
from utils.utils import (
    init_session_state_variables,
    dataset_unzip,
    rename_wrong_file,
    check_if_dataset_exists,
)
from utils.UNet_2D import init_model
from utils.variables import data_path
from utils.img_processing import resize_predicted_seg
from utils.predict_seg import patient_has_changed_update_token, predict_btn_click
from utils.session import SESSION_STATE
from utils.image_processing_helpers import (
    normalize_image_slice,
    filter_prediction_by_class,
    extract_slice_by_plane,
    create_slicer_function,
    get_gif_animation_params,
    render_slice_with_overlay,
)
from utils.metrics_helpers import (
    calculate_class_metrics,
    calculate_total_tumor_metrics,
    get_class_explanations,
    get_selected_class_metrics,
)
from utils.three_views_helpers import (
    extract_three_view_slices,
    calculate_crosshair_positions,
    render_three_views,
)

import nibabel as nib
import matplotlib.pyplot as plt
import numpy as np
import base64
import io
import cv2
import os
from flask_cors import CORS
import imageio
from utils.skin_detection import predict_skin_cancer, SKIN_CANCER_CLASSES
from utils.lung_detection import predict_lung_condition
from utils.eye_detection import predict_dr_severity
from db import engine
from models import Base, SignInLog, User
from werkzeug.security import generate_password_hash, check_password_hash
import base64

DEFAULT_WORLD_COORDS = {"x": -92.0, "y": 114.0, "z": 61.0}

app = Flask(__name__)
CORS(app, origins=["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"])

# Initialize database tables if a database is configured
if engine is not None:
    try:
        # Import models to ensure they're registered with Base
        from models import User, SignInLog
        Base.metadata.create_all(bind=engine)
        print("[INFO] Database tables initialized successfully.")
    except Exception as e:
        import traceback
        print(f"[WARN] Failed to initialize database tables: {e}")
        print(f"[WARN] Traceback: {traceback.format_exc()}")
else:
    print("[INFO] DATABASE_URL not set - sign-in logs and user accounts will not be persisted.")

# Load model once
model = init_model()
init_session_state_variables()

# Initialize dataset
dataset_unzip()
rename_wrong_file(data_path)
check_if_dataset_exists()


def fig_to_base64(fig):
    """Encode matplotlib figure to base64 string."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches='tight')
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


#############################################
#           AUTH / USER MANAGEMENT
#############################################


@app.route("/api/auth/signup", methods=["POST"])
def signup():
    """
    Register a new user account.
    """
    from db import SessionLocal
    import traceback

    if SessionLocal is None:
        return jsonify({"error": "Database not configured. Please set DATABASE_URL environment variable."}), 500

    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("fullName", "").strip()
    speciality = data.get("speciality", "").strip()

    # Validation
    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if not full_name:
        return jsonify({"error": "Full name is required"}), 400
    if not speciality:
        return jsonify({"error": "Speciality is required"}), 400

    db = None
    try:
        db = SessionLocal()
        if db is None:
            return jsonify({"error": "Failed to create database session"}), 500

        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            return jsonify({"error": "Email already registered"}), 409

        # Create new user
        password_hash = generate_password_hash(password)
        new_user = User(
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            speciality=speciality
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return jsonify({
            "status": "success",
            "message": "Account created successfully",
            "user": {
                "email": new_user.email,
                "fullName": new_user.full_name,
                "speciality": new_user.speciality
            }
        }), 201
    except Exception as e:
        if db:
            db.rollback()
        error_trace = traceback.format_exc()
        print(f"[ERROR] Failed to create user: {e}")
        print(f"[ERROR] Traceback: {error_trace}")
        return jsonify({"error": f"Failed to create account: {str(e)}"}), 500
    finally:
        if db:
            db.close()


@app.route("/api/auth/signin", methods=["POST"])
def signin():
    """
    Authenticate a user and return user data.
    """
    from db import SessionLocal
    import traceback

    if SessionLocal is None:
        return jsonify({"error": "Database not configured. Please set DATABASE_URL environment variable."}), 500

    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not password:
        return jsonify({"error": "Password is required"}), 400

    db = None
    try:
        db = SessionLocal()
        if db is None:
            return jsonify({"error": "Failed to create database session"}), 500

        # Find user by email
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        # Verify password
        if not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401

        # Log sign-in event
        ip_address = request.headers.get("X-Forwarded-For", request.remote_addr)
        user_agent = request.headers.get("User-Agent", "")
        try:
            log = SignInLog(
                email=user.email,
                full_name=user.full_name,
                speciality=user.speciality,
                ip_address=ip_address,
                user_agent=user_agent[:512],
            )
            db.add(log)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[WARN] Failed to log sign-in: {e}")

        return jsonify({
            "status": "success",
            "user": {
                "email": user.email,
                "fullName": user.full_name,
                "speciality": user.speciality
            }
        }), 200
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[ERROR] Sign-in error: {e}")
        print(f"[ERROR] Traceback: {error_trace}")
        return jsonify({"error": f"Authentication failed: {str(e)}"}), 500
    finally:
        if db:
            db.close()


@app.route("/api/auth/signin-log", methods=["POST"])
def signin_log():
    """
    Record a sign-in event in the PostgreSQL database.

    This does NOT perform authentication; it only logs successful sign-ins
    triggered from the frontend after a user is considered logged in.
    """
    from db import SessionLocal  # imported lazily to avoid circulars

    if SessionLocal is None:
        # Database not configured – do not fail the frontend, just acknowledge.
        return jsonify({"status": "ok", "message": "Database not configured; log not persisted"}), 200

    data = request.get_json() or {}
    email = data.get("email")
    full_name = data.get("fullName")
    speciality = data.get("speciality")

    if not email:
        return jsonify({"error": "email is required"}), 400

    # Extract basic request metadata
    ip_address = request.headers.get("X-Forwarded-For", request.remote_addr)
    user_agent = request.headers.get("User-Agent", "")

    db = SessionLocal()
    try:
        log = SignInLog(
            email=email,
            full_name=full_name,
            speciality=speciality,
            ip_address=ip_address,
            user_agent=user_agent[:512],  # safety truncate
        )
        db.add(log)
        db.commit()
        return jsonify({"status": "ok"}), 201
    except Exception as e:
        db.rollback()
        print(f"[WARN] Failed to persist sign-in log: {e}")
        # Do not break login flow if logging fails
        return jsonify({"status": "ok", "message": "Failed to persist log"}), 200
    finally:
        db.close()


def get_modality_file(patient_path, modality):
    """Get the file path for a specific modality."""
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


def world_to_voxel(affine, coords):
    """Convert world coordinates to voxel coordinates."""
    try:
        point = np.array([coords["x"], coords["y"], coords["z"], 1.0])
        voxel = np.linalg.inv(affine).dot(point)[:3]
        return np.round(voxel).astype(int)
    except Exception:
        return np.array([
            coords.get("x", DEFAULT_WORLD_COORDS["x"]),
            coords.get("y", DEFAULT_WORLD_COORDS["y"]),
            coords.get("z", DEFAULT_WORLD_COORDS["z"]),
        ], dtype=int)


def get_prediction_volume(patient_path, reference_shape):
    """Returns the predicted segmentation volume (same shape as reference image)."""
    patient_name = os.path.basename(os.path.normpath(patient_path))
    patient_root = os.path.join(patient_path, patient_name)

    current_patient = SESSION_STATE.get("current_patient")
    if current_patient != patient_path:
        patient_has_changed_update_token()
        SESSION_STATE["current_patient"] = patient_path

    pred_raw = predict_btn_click(model, patient_root)
    if pred_raw is None:
        raise ValueError("Failed to generate prediction")

    if len(pred_raw.shape) != 4 or pred_raw.shape[3] != 4:
        raise ValueError(f"Invalid prediction shape: {pred_raw.shape}")

    pred_resized = resize_predicted_seg(pred_raw)
    pred_classes = np.argmax(pred_resized, axis=3).astype(np.int16)
    pred_vol = np.moveaxis(pred_classes, 0, 2)

    if pred_vol.shape != reference_shape:
        resized_pred = np.zeros(reference_shape, dtype=np.int16)
        limit = min(pred_vol.shape[2], reference_shape[2])
        for z in range(limit):
            resized_pred[:, :, z] = cv2.resize(
                pred_vol[:, :, z].astype(np.float32),
                (reference_shape[1], reference_shape[0]),
                interpolation=cv2.INTER_NEAREST,
            ).astype(np.int16)
        pred_vol = resized_pred

    return pred_vol


#############################################
#               ROUTES
#############################################

@app.route("/patient_info", methods=["POST"])
def patient_info():
    """Get patient information and path."""
    data = request.get_json()
    name = data.get("patient_name")
    base_dir = r"C:/Users/Home/OneDrive - Groupe ESAIP/Project-Management/Project-Team5/Jupyter-Notebook/Data/BraTS2020_TrainingData/MICCAI_BraTS2020_TrainingData"
    patient_path = os.path.join(base_dir, name)

    if not os.path.isdir(patient_path):
        return jsonify({"error": "Patient folder not found", "path": patient_path}), 404

    return jsonify({"path": patient_path})


@app.route("/upload_folder", methods=["POST"])
def upload_folder():
    """Upload a new patient folder to the dataset directory."""
    try:
        if 'files' not in request.files:
            return jsonify({"error": "No files provided"}), 400
        
        folder_name = request.form.get("folder_name")
        if not folder_name:
            return jsonify({"error": "Folder name not provided"}), 400
        
        # Base directory for patient data
        base_dir = r"C:/Users/Home/OneDrive - Groupe ESAIP/Project-Management/Project-Team5/Jupyter-Notebook/Data/BraTS2020_TrainingData/MICCAI_BraTS2020_TrainingData"
        patient_dir = os.path.join(base_dir, folder_name)
        
        # Create patient directory if it doesn't exist
        os.makedirs(patient_dir, exist_ok=True)
        
        # Get all uploaded files
        files = request.files.getlist("files")
        
        if not files or len(files) == 0:
            return jsonify({"error": "No files in upload"}), 400
        
        # Save each file to the patient directory
        saved_files = []
        for file in files:
            if file.filename:
                # Preserve directory structure if present
                filename = file.filename
                # Remove folder name prefix if present (e.g., "Brats20_Test_001/file.nii" -> "file.nii")
                if "/" in filename:
                    filename = filename.split("/", 1)[1]
                
                file_path = os.path.join(patient_dir, filename)
                # Create subdirectories if needed
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                file.save(file_path)
                saved_files.append(filename)
        
        return jsonify({
            "success": True,
            "message": f"Patient folder '{folder_name}' uploaded successfully",
            "folder_name": folder_name,
            "path": patient_dir,
            "files_count": len(saved_files),
            "files": saved_files
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to upload folder: {str(e)}"}), 500


@app.route("/get_slice", methods=["POST"])
def get_slice():
    """Get a single slice with prediction overlay."""
    data = request.get_json()
    patient_path = data.get("patient_path")
    modality = data.get("modality")
    plane = data.get("plane", "Axial")
    selected_class = data.get("class", "All")
    slice_idx = int(data.get("slice", 80))

    if not patient_path:
        return jsonify({"error": "patient_path missing"}), 400

    try:
        modality_file = get_modality_file(patient_path, modality)
        img = nib.load(modality_file).get_fdata()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    try:
        pred_vol = get_prediction_volume(patient_path, img.shape)
    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    # Extract slice based on plane
    slice_img, slice_pred = extract_slice_by_plane(img, pred_vol, plane, slice_idx)
    
    # Filter prediction by selected class
    filtered_pred = filter_prediction_by_class(slice_pred, selected_class)
    
    # Render slice with overlay
    fig = render_slice_with_overlay(slice_img, filtered_pred)
    encoded = fig_to_base64(fig)
    plt.close(fig)

    return jsonify({"image": encoded})


@app.route("/get_analysis", methods=["POST"])
def get_analysis():
    """Returns analysis metrics and class explanations for the predicted segmentation."""
    data = request.get_json()
    patient_path = data.get("patient_path")
    selected_class = data.get("class", "All")

    if not patient_path:
        return jsonify({"error": "patient_path missing"}), 400

    try:
        flair_file = get_modality_file(patient_path, "FLAIR")
        flair_img = nib.load(flair_file)
        img = flair_img.get_fdata()
        affine = flair_img.affine
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    try:
        pred_vol = get_prediction_volume(patient_path, img.shape)
    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    # Calculate voxel spacing and volume
    voxel_spacing = np.abs(np.diag(affine[:3, :3]))
    voxel_volume_mm3 = np.prod(voxel_spacing)

    # Calculate metrics
    class_metrics = calculate_class_metrics(pred_vol, voxel_volume_mm3)
    total_tumor_metrics = calculate_total_tumor_metrics(pred_vol, voxel_volume_mm3)
    selected_metrics = get_selected_class_metrics(class_metrics, selected_class)

    # Get explanations
    class_explanations = get_class_explanations()
    explanation_key = selected_class if selected_class in class_explanations else "All"
    explanation = class_explanations.get(explanation_key, class_explanations["All"])

    return jsonify({
        "metrics": {
            "total_tumor": total_tumor_metrics,
            "by_class": class_metrics,
            "selected_class_metrics": selected_metrics
        },
        "explanation": explanation,
        "voxel_spacing_mm": voxel_spacing.tolist(),
        "image_dimensions": list(img.shape)
    })


@app.route("/get_gif", methods=["POST"])
def get_gif():
    """Generate animated GIF of slices through the volume."""
    data = request.get_json()
    patient_path = data.get("patient_path")
    modality = data.get("modality")
    plane = data.get("plane", "Axial")
    selected_class = data.get("class", "All")

    try:
        modality_file = get_modality_file(patient_path, modality)
        img = nib.load(modality_file).get_fdata()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    try:
        pred_vol = get_prediction_volume(patient_path, img.shape)
    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    # Create slicer function and get animation parameters
    num_slices, slicer = create_slicer_function(img, pred_vol, plane)
    stride, fps = get_gif_animation_params(plane, num_slices)
    idxs = range(0, num_slices, stride)

    # Generate frames
    frames = []
    target_h, target_w = 256, 256

    for idx in idxs:
        slice_img, slice_pred = slicer(idx)
        
        # Ensure shapes match
        if slice_pred.shape != slice_img.shape:
            slice_pred = cv2.resize(
                slice_pred.astype(np.float32),
                (slice_img.shape[1], slice_img.shape[0]),
                interpolation=cv2.INTER_NEAREST
            ).astype(np.int16)
        
        # Filter and render
        filtered_pred = filter_prediction_by_class(slice_pred, selected_class)
        fig = render_slice_with_overlay(slice_img, filtered_pred, figsize=(4, 4), dpi=100)
        fig.canvas.draw()
        
        frame = np.asarray(fig.canvas.renderer.buffer_rgba())[..., :3]
        frame = cv2.resize(frame, (target_w, target_h))
        frames.append(frame)
        plt.close(fig)

    if len(frames) == 0:
        return jsonify({"error": f"No frames generated. num_slices={num_slices}"}), 500

    # Create GIF
    gif_bytes = io.BytesIO()
    imageio.mimsave(gif_bytes, frames, format="GIF", fps=fps, loop=0)
    gif_bytes.seek(0)
    encoded_gif = base64.b64encode(gif_bytes.read()).decode("utf-8")

    return jsonify({"gif": encoded_gif})


@app.route("/get_three_views", methods=["POST"])
def get_three_views():
    """Returns a combined visualization of sagittal, coronal, and axial views with prediction overlay."""
    data = request.get_json()
    patient_path = data.get("patient_path")
    selected_class = data.get("class", "All")
    coords = {
        "x": float(data.get("x", DEFAULT_WORLD_COORDS["x"])),
        "y": float(data.get("y", DEFAULT_WORLD_COORDS["y"])),
        "z": float(data.get("z", DEFAULT_WORLD_COORDS["z"])),
    }

    if not patient_path:
        return jsonify({"error": "patient_path missing"}), 400

    try:
        flair_file = get_modality_file(patient_path, "FLAIR")
        flair_img = nib.load(flair_file)
        img = flair_img.get_fdata()
        affine = flair_img.affine
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    try:
        pred_vol = get_prediction_volume(patient_path, img.shape)
    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    # Extract slices and calculate crosshair positions
    voxel_coords = world_to_voxel(affine, coords)
    sagittal_img, sagittal_pred, coronal_img, coronal_pred, axial_img, axial_pred = extract_three_view_slices(
        img, pred_vol, voxel_coords
    )
    
    x_idx, y_idx, z_idx = voxel_coords[0], voxel_coords[1], voxel_coords[2]
    sag_cross, cor_cross, axial_cross = calculate_crosshair_positions(
        sagittal_img.shape, coronal_img.shape, axial_img.shape, x_idx, y_idx, z_idx
    )

    # Normalize images and filter predictions
    sagittal_img_norm = normalize_image_slice(sagittal_img)
    coronal_img_norm = normalize_image_slice(coronal_img)
    axial_img_norm = normalize_image_slice(axial_img)
    
    sagittal_pred = filter_prediction_by_class(sagittal_pred, selected_class)
    coronal_pred = filter_prediction_by_class(coronal_pred, selected_class)
    axial_pred = filter_prediction_by_class(axial_pred, selected_class)

    # Prepare views data
    views = [
        ("Sagittal", sagittal_img_norm, sagittal_pred, sag_cross, f"z={coords['z']:.0f}"),
        ("Coronal", coronal_img_norm, coronal_pred, cor_cross, f"y={coords['y']:.0f}"),
        ("Axial", axial_img_norm, axial_pred, axial_cross, f"x={coords['x']:.0f}"),
    ]

    # Render and encode
    fig = render_three_views(views, coords)
    encoded = fig_to_base64(fig)
    plt.close(fig)

    return jsonify({"image": encoded})


@app.route("/analyze_skin", methods=["POST"])
def analyze_skin():
    """Analyze skin image for cancer detection using ResNet multiclass model."""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Predict skin cancer
        result = predict_skin_cancer(image_file)
        
        # Encode heatmap to base64
        _, buffer = cv2.imencode('.jpg', result['heatmap'])
        heatmap_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Encode raw heatmap to base64
        _, buffer_raw = cv2.imencode('.jpg', result['heatmap_raw'])
        heatmap_raw_base64 = base64.b64encode(buffer_raw).decode('utf-8')
        
        return jsonify({
            "success": True,
            "predicted_class": result['predicted_class'],
            "result_type": result['result_type'],
            "confidence": result['confidence'],
            "model_precision": result['model_precision'],
            "top3_predictions": result['top3_predictions'],
            "all_predictions": result['all_predictions'],
            "heatmap": heatmap_base64,
            "heatmap_raw": heatmap_raw_base64,
            "explanation": result['explanation'],
            "recommendations": result['recommendations']
        })
        
    except FileNotFoundError as e:
        return jsonify({"error": f"Model file not found: {str(e)}"}), 500
    except Exception as e:
        print(f"Error in analyze_skin: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to analyze image: {str(e)}"}), 500


@app.route("/analyze_lung", methods=["POST"])
def analyze_lung():
    """Analyze lung X-ray image for pneumonia detection using ViT model."""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Predict lung condition
        result = predict_lung_condition(image_file)
        
        # Encode heatmap to base64
        _, buffer = cv2.imencode('.jpg', result['heatmap'])
        heatmap_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Encode raw heatmap to base64
        _, buffer_raw = cv2.imencode('.jpg', result['heatmap_raw'])
        heatmap_raw_base64 = base64.b64encode(buffer_raw).decode('utf-8')
        
        return jsonify({
            "success": True,
            "predicted_class": result['predicted_class'],
            "result_type": result['result_type'],
            "confidence": result['confidence'],
            "model_precision": result['model_precision'],
            "top3_predictions": result['top3_predictions'],
            "all_predictions": result['all_predictions'],
            "heatmap": heatmap_base64,
            "heatmap_raw": heatmap_raw_base64,
            "explanation": result['explanation'],
            "recommendations": result['recommendations']
        })
        
    except FileNotFoundError as e:
        return jsonify({"error": f"Model file not found: {str(e)}"}), 500
    except Exception as e:
        print(f"Error in analyze_lung: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to analyze image: {str(e)}"}), 500


@app.route("/analyze_eye", methods=["POST"])
def analyze_eye():
    """Analyze eye image for diabetic retinopathy detection using FastAI model."""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Predict diabetic retinopathy severity
        result = predict_dr_severity(image_file)
        
        # Encode heatmap to base64
        _, buffer = cv2.imencode('.jpg', result['heatmap'])
        heatmap_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Encode raw heatmap to base64
        _, buffer_raw = cv2.imencode('.jpg', result['heatmap_raw'])
        heatmap_raw_base64 = base64.b64encode(buffer_raw).decode('utf-8')
        
        return jsonify({
            "success": True,
            "predicted_class": result['predicted_class'],
            "severity_level": result['severity_level'],  # 0-4 scale
            "result_type": result['result_type'],
            "confidence": result['confidence'],
            "model_precision": result['model_precision'],
            "top3_predictions": result['top3_predictions'],
            "all_predictions": result['all_predictions'],
            "heatmap": heatmap_base64,
            "heatmap_raw": heatmap_raw_base64,
            "explanation": result['explanation'],
            "recommendations": result['recommendations']
        })
        
    except FileNotFoundError as e:
        return jsonify({"error": f"Model file not found: {str(e)}"}), 500
    except Exception as e:
        print(f"Error in analyze_eye: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to analyze image: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
