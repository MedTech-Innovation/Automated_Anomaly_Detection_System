"""
Diabetic Retinopathy Detection Module
Handles loading and using a Keras/TensorFlow model for diabetic retinopathy detection.
"""

import os
import numpy as np
import cv2
from PIL import Image
import warnings
warnings.filterwarnings('ignore')

# Import TensorFlow/Keras
try:
    import tensorflow as tf
    from tensorflow import keras
except ImportError:
    raise ImportError("TensorFlow is not installed. Please install it with: pip install tensorflow")

# Diabetic Retinopathy severity scale (0-4)
DR_CLASSES = [
    'No_DR',           # 0 - No Diabetic Retinopathy
    'Mild',            # 1 - Mild DR
    'Moderate',        # 2 - Moderate DR
    'Severe',          # 3 - Severe DR
    'Proliferate_DR'   # 4 - Proliferative DR
]

# Map severity levels to result types
SEVERITY_TO_RESULT = {
    0: "Normal",      # No DR
    1: "Anomaly",     # Mild - requires monitoring
    2: "Anomaly",     # Moderate - requires treatment
    3: "Anomaly",     # Severe - urgent treatment needed
    4: "Anomaly"      # Proliferative - critical, immediate treatment
}

# Map class names to display names
CLASS_DISPLAY_NAMES = {
    'No_DR': 'No DR',
    'Mild': 'Mild',
    'Moderate': 'Moderate',
    'Severe': 'Severe',
    'Proliferate_DR': 'Proliferative DR'
}

# Model configuration
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model", "diabetic-retinopathy")
MODEL_FILE = os.path.join(MODEL_PATH, "best_model.h5")

# Global model variable
eye_model = None


def preprocess_image(image_file):
    """
    Preprocess image for Keras model prediction.
    Must match the preprocessing used during training.
    
    Args:
        image_file: File object or image path
    Returns:
        Preprocessed image array (384, 384, 3) and original image
    """
    # Read image
    if isinstance(image_file, str):
        # If it's a file path
        img = cv2.imread(image_file)
        if img is None:
            raise ValueError(f"Could not read image from path: {image_file}")
    else:
        # If it's a file object
        image_file.seek(0)
        img_array = np.frombuffer(image_file.read(), np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image from file object")
    
    # Convert BGR to RGB
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Resize to (384, 384)
    img = cv2.resize(img, (384, 384))
    
    # Normalize to [0, 1]
    img = img.astype(np.float32) / 255.0
    
    # Store original for heatmap generation
    img_original = (img * 255).astype(np.uint8)
    
    return img, img_original


def load_eye_model():
    """Load the Keras/TensorFlow model from .h5 file."""
    global eye_model
    
    if eye_model is None:
        try:
            if not os.path.exists(MODEL_FILE):
                raise FileNotFoundError(
                    f"Model file not found. Expected:\n"
                    f"  - {MODEL_FILE}\n"
                    f"Please ensure the model file exists in the model directory."
                )
            
            print(f"Loading diabetic retinopathy model from: {MODEL_FILE}")
            
            # Load Keras model
            # Try loading with custom_objects if needed
            try:
                eye_model = keras.models.load_model(MODEL_FILE, compile=False)
            except Exception as e:
                print(f"Warning: Standard load failed: {e}")
                print("Trying to load with safe_mode=False...")
                try:
                    eye_model = keras.models.load_model(MODEL_FILE, compile=False, safe_mode=False)
                except Exception as e2:
                    print(f"Warning: Safe mode load failed: {e2}")
                    # Last resort: try loading weights only
                    raise RuntimeError(f"Could not load model: {e2}")
            
            print(f"Diabetic retinopathy model loaded successfully")
            print(f"Model input shape: {eye_model.input_shape}")
            print(f"Model output shape: {eye_model.output_shape}")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Failed to load eye detection model: {str(e)}")
    
    return eye_model


def predict_dr_severity(image_file):
    """
    Predict diabetic retinopathy severity from an image (0-4 scale).
    Args:
        image_file: File object or image path
    Returns:
        Dictionary with predictions, severity level, confidence, heatmap, and metrics
    """
    model = load_eye_model()
    
    # Preprocess image
    img_preprocessed, img_original = preprocess_image(image_file)
    
    try:
        # Add batch dimension
        img_batch = np.expand_dims(img_preprocessed, axis=0)
        
        # Make prediction
        predictions = model.predict(img_batch, verbose=0)
        
        # Get predicted class index
        predicted_idx = int(np.argmax(predictions, axis=1)[0])
        
        # Get probabilities
        probabilities = predictions[0]
        
        # Ensure predicted_idx is in valid range (0-4)
        predicted_idx = max(0, min(4, predicted_idx))
        
        # Get confidence (probability of predicted class)
        confidence = float(probabilities[predicted_idx])
        
        # Get predicted class name
        predicted_class = DR_CLASSES[predicted_idx]
        predicted_class_display = CLASS_DISPLAY_NAMES.get(predicted_class, predicted_class)
        
        # Get result type based on severity
        result_type = SEVERITY_TO_RESULT.get(predicted_idx, "Normal")
        
        # Generate simple heatmap (centered on image)
        original_height, original_width = img_original.shape[:2]
        
        # Create a simple heatmap based on severity (higher severity = more intense)
        heatmap = np.zeros((original_height, original_width), dtype=np.float32)
        center_y, center_x = original_height // 2, original_width // 2
        
        # Create radial gradient based on severity level
        y, x = np.ogrid[:original_height, :original_width]
        radius = min(original_height, original_width) // 3
        distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)
        
        # Intensity increases with severity (0-4)
        intensity = (predicted_idx + 1) / 5.0
        heatmap = np.exp(-distance / (radius * (2 - intensity)))
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)
        
        # Convert to colored heatmap
        heatmap_uint8 = (heatmap * 255).astype(np.uint8)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Overlay heatmap on original image
        img_original_float = img_original.astype(np.float32) / 255.0
        heatmap_float = heatmap_colored.astype(np.float32) / 255.0
        overlay = cv2.addWeighted(img_original_float, 0.7, heatmap_float, 0.3, 0)
        overlay_uint8 = (overlay * 255).astype(np.uint8)
        
        # Calculate metrics
        model_precision = float(confidence * 100)
        
        # Create predictions list (all 5 classes)
        all_predictions = {}
        for i in range(5):
            class_name = DR_CLASSES[i]
            display_name = CLASS_DISPLAY_NAMES.get(class_name, class_name)
            if i < len(probabilities):
                all_predictions[display_name] = float(probabilities[i] * 100)
            else:
                all_predictions[display_name] = 0.0
        
        # Get explanation and recommendations
        explanation, recommendations = get_explanation_and_recommendations(
            predicted_idx, predicted_class_display, result_type, confidence * 100
        )
        
        return {
            "predicted_class": predicted_class_display,
            "severity_level": predicted_idx,  # 0-4 scale
            "result_type": result_type,
            "confidence": confidence * 100,
            "model_precision": model_precision,
            "top3_predictions": [
                {
                    "class": predicted_class_display,
                    "confidence": float(confidence * 100),
                    "result_type": result_type
                }
            ],
            "all_predictions": all_predictions,
            "heatmap": overlay_uint8,
            "heatmap_raw": heatmap_colored,
            "explanation": explanation,
            "recommendations": recommendations
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise RuntimeError(f"Failed to predict diabetic retinopathy: {str(e)}")


def get_explanation_and_recommendations(severity_level, class_name, result_type, confidence):
    """
    Generate explanation and recommendations based on severity level (0-4).
    """
    explanations = {
        0: "No Diabetic Retinopathy (No DR) detected. The retina appears healthy with no signs of diabetic retinopathy. Continue regular eye examinations as recommended by your ophthalmologist.",
        1: f"Mild Diabetic Retinopathy detected with {confidence:.1f}% confidence. Early stage of diabetic retinopathy with minor changes in the retina. Microaneurysms may be present. Regular monitoring is essential.",
        2: f"Moderate Diabetic Retinopathy detected with {confidence:.1f}% confidence. More significant changes in the retina are present. Blood vessels may be blocked, and there may be signs of retinal swelling. Treatment may be needed to prevent progression.",
        3: f"Severe Diabetic Retinopathy detected with {confidence:.1f}% confidence. Extensive damage to the retina with many blocked blood vessels. The retina is not receiving adequate blood supply. Immediate treatment is required to prevent vision loss.",
        4: f"Proliferative Diabetic Retinopathy detected with {confidence:.1f}% confidence. The most advanced stage of diabetic retinopathy. New abnormal blood vessels are growing on the retina, which can lead to severe vision loss or blindness. Urgent medical intervention is critical."
    }
    
    recommendations = {
        0: "Continue regular annual eye examinations. Maintain good blood sugar control and follow your diabetes management plan. No immediate treatment needed.",
        1: "Schedule follow-up eye examination within 6-12 months. Work closely with your healthcare provider to maintain optimal blood sugar, blood pressure, and cholesterol levels. Early intervention can prevent progression.",
        2: "Consult with a retina specialist immediately. Treatment options may include laser therapy or injections to prevent further damage. Strict blood sugar control is crucial. Follow-up appointments will be needed every 3-6 months.",
        3: "URGENT: Immediate consultation with a retina specialist is required. Treatment is necessary to prevent severe vision loss. Options include laser photocoagulation, anti-VEGF injections, or vitrectomy surgery. Do not delay treatment.",
        4: "CRITICAL: Emergency medical attention required. Proliferative DR can lead to blindness if not treated promptly. Treatment options include pan-retinal photocoagulation, anti-VEGF therapy, or vitrectomy. Immediate action is essential to preserve vision."
    }
    
    explanation = explanations.get(severity_level, f"{class_name} detected with {confidence:.1f}% confidence.")
    recommendation = recommendations.get(severity_level, "Consult with an ophthalmologist for further evaluation.")
    
    return explanation, recommendation
