"""
Skin Cancer Detection Module
Handles loading and using the Vision Transformer (ViT) model from Hugging Face.
Uses transformers library with PyTorch backend.
"""

import os
import numpy as np
import cv2
from PIL import Image
import torch
from transformers import ViTImageProcessor, ViTForImageClassification

# 12 classes of skin conditions (from Hugging Face model)
# Classes in the EXACT order used during training (label 0-11)
CLASS_NAMES = [
    'actinic keratosis',           # Label 0 - AK (Benign, precancerous)
    'basal cell carcinoma',        # Label 1 - BCC (Malignant)
    'clear skin',                  # Label 2 - Normal/Healthy skin
    'dermatofibroma',              # Label 3 - DF (Benign)
    'melanoma',                    # Label 4 - MEL (Malignant)
    'melanoma metastasis',         # Label 5 - Metastatic melanoma (Malignant)
    'nevus',                       # Label 6 - NV (Benign)
    'random',                      # Label 7 - Random/Uncertain
    'seborrheic keratosis',        # Label 8 - SK (Benign)
    'solar lentigo',              # Label 9 - Age spots (Benign)
    'squamous cell carcinoma',    # Label 10 - SCC (Malignant)
    'vascular lesion'              # Label 11 - VASC (Benign)
]

# Use CLASS_NAMES as SKIN_CANCER_CLASSES for compatibility
SKIN_CANCER_CLASSES = CLASS_NAMES

# Map classes to result types (Malign/Benign/Normal)
CLASS_TO_RESULT = {
    "actinic keratosis": "Benign",  # Precancerous, typically benign but can progress
    "basal cell carcinoma": "Malign",
    "clear skin": "Normal",         # Healthy skin
    "dermatofibroma": "Benign",
    "melanoma": "Malign",
    "melanoma metastasis": "Malign",  # Advanced malignant
    "nevus": "Benign",
    "random": "Normal",             # Uncertain/random - treat as normal
    "seborrheic keratosis": "Benign",
    "solar lentigo": "Benign",     # Age spots, benign
    "squamous cell carcinoma": "Malign",
    "vascular lesion": "Benign"
}

# Model configuration
# Local model path - can be a directory or a Hugging Face repo identifier
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model", "skin-cancer")
MODEL_SAFETENSORS = os.path.join(MODEL_PATH, "model.safetensors")
# Image size from config.json: 384x384
IMG_SIZE = 384  # Model expects 384x384 images (from config.json)

# Global model variables
skin_model = None
processor = None
device = None


def load_skin_model():
    """Load the Vision Transformer model and processor from local file."""
    global skin_model, processor, device
    
    if skin_model is None:
        try:
            # Check if we have a local model directory
            config_path = os.path.join(MODEL_PATH, "config.json")
            safetensors_exists = os.path.exists(MODEL_SAFETENSORS)
            config_exists = os.path.exists(config_path)
            
            if not (safetensors_exists and config_exists):
                raise FileNotFoundError(
                    f"Model files not found. Expected:\n"
                    f"  - {config_path}\n"
                    f"  - {MODEL_SAFETENSORS}\n"
                    f"Please ensure both files exist in the model directory."
                )
            
            # Load from local directory
            print(f"Loading ViT model and processor from local directory: {MODEL_PATH}")
            processor = ViTImageProcessor.from_pretrained(MODEL_PATH)
            skin_model = ViTForImageClassification.from_pretrained(MODEL_PATH)
            
            # Set device (CUDA, MPS, or CPU)
            device = torch.device(
                "cuda" if torch.cuda.is_available() 
                else "mps" if torch.backends.mps.is_available() 
                else "cpu"
            )
            skin_model = skin_model.to(device)
            skin_model.eval()
            
            print(f"Model loaded successfully on device: {device}")
            if hasattr(skin_model, 'config'):
                print(f"Model config: {skin_model.config}")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Failed to load skin detection model: {str(e)}")
    
    return skin_model, processor, device


def preprocess_image(image_file, processor):
    """
    Preprocess image using ViTImageProcessor.
    The processor will resize to 384x384 and normalize according to preprocessor_config.json.
    
    Args:
        image_file: File object or image path
        processor: ViTImageProcessor instance
    Returns:
        Processed inputs (tensors) and original PIL image
    """
    # Read image using PIL
    if isinstance(image_file, str):
        # If it's a file path
        img = Image.open(image_file).convert('RGB')
    else:
        # If it's a file object
        image_file.seek(0)  # Reset file pointer
        img = Image.open(image_file).convert('RGB')
    
    # Process image using ViT processor
    # The processor will automatically:
    # - Resize to 384x384 (from preprocessor_config.json)
    # - Normalize with mean=[0.5, 0.5, 0.5] and std=[0.5, 0.5, 0.5]
    # - Rescale by 1/255 (0.00392156862745098)
    inputs = processor(images=img, return_tensors="pt", padding=True)
    
    # Return processed inputs and original image
    return inputs, img


def generate_heatmap_vit(image, model, inputs, predicted_class_idx):
    """
    Generate attention-based heatmap for ViT model to highlight where the anomaly is.
    Uses the attention weights from the transformer to create a precise heatmap.
    """
    try:
        # Get original image size
        img_array = np.array(image)
        original_height, original_width = img_array.shape[:2]
        
        # Enable gradient computation for attention
        model.eval()
        
        # Get attention weights from the model
        # We need to access the attention layers
        with torch.no_grad():
            outputs = model(**inputs, output_attentions=True)
            attentions = outputs.attentions  # List of attention tensors from each layer
        
        # Use the last layer's attention (most relevant for classification)
        # attentions[-1] shape: (batch, num_heads, num_patches+1, num_patches+1)
        # We want attention to the [CLS] token (index 0) which aggregates information
        last_layer_attention = attentions[-1]  # Last transformer layer
        
        # Average across all attention heads
        # Shape: (batch, num_heads, num_patches+1, num_patches+1)
        # We take attention from all tokens to [CLS] token (column 0), excluding [CLS] itself
        attention_to_cls = last_layer_attention[0, :, 0, 1:].mean(dim=0)  # Average over heads, exclude [CLS] token
        
        # Get patch size and number of patches from model config
        patch_size = model.config.patch_size
        image_size = model.config.image_size
        num_patches_per_side = image_size // patch_size
        
        # Reshape attention to spatial dimensions
        # attention_to_cls shape: (num_patches,)
        attention_map = attention_to_cls.reshape(num_patches_per_side, num_patches_per_side)
        
        # Normalize attention map
        attention_map = attention_map.cpu().numpy()
        attention_map = (attention_map - attention_map.min()) / (attention_map.max() - attention_map.min() + 1e-8)
        
        # Resize attention map to original image size
        heatmap = cv2.resize(attention_map, (original_width, original_height), interpolation=cv2.INTER_CUBIC)
        
        # Apply Gaussian blur for smoother visualization
        heatmap = cv2.GaussianBlur(heatmap, (21, 21), 0)
        
        # Normalize again after resize
        if heatmap.max() > 0:
            heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min())
        
        # Convert to colored heatmap (0-255 range)
        heatmap_uint8 = (heatmap * 255).astype(np.uint8)
        heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        return heatmap_colored, heatmap
        
    except Exception as e:
        print(f"Error generating attention heatmap: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallback: create a simple centered heatmap
        img_array = np.array(image)
        original_height, original_width = img_array.shape[:2]
        heatmap = np.zeros((original_height, original_width), dtype=np.float32)
        center_y, center_x = original_height // 2, original_width // 2
        y, x = np.ogrid[:original_height, :original_width]
        mask = (x - center_x)**2 + (y - center_y)**2 <= min(original_height, original_width)**2 // 4
        heatmap[mask] = 0.7
        heatmap_colored = cv2.applyColorMap((heatmap * 255).astype(np.uint8), cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        return heatmap_colored, heatmap




def predict_skin_cancer(image_file):
    """
    Predict skin cancer type from an image using Vision Transformer.
    Args:
        image_file: File object or image path
    Returns:
        Dictionary with predictions, confidence, heatmap, and metrics
    """
    model, processor, device = load_skin_model()
    
    # Preprocess image
    inputs, img_original = preprocess_image(image_file, processor)
    
    # Move inputs to device
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    # Make prediction
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Get prediction results
    logits = outputs.logits
    probabilities = torch.nn.functional.softmax(logits, dim=1)[0]
    
    # Get predicted class index and confidence
    predicted_class_idx = torch.argmax(probabilities).item()
    confidence = probabilities[predicted_class_idx].item()
    
    # Get predicted class name from model config or use our mapping
    if hasattr(model.config, 'id2label') and model.config.id2label:
        predicted_class = model.config.id2label[predicted_class_idx]
    else:
        # Fallback to our class names if model doesn't have id2label
        if predicted_class_idx < len(SKIN_CANCER_CLASSES):
            predicted_class = SKIN_CANCER_CLASSES[predicted_class_idx]
        else:
            predicted_class = f"Class_{predicted_class_idx}"
            print(f"Warning: Predicted class index {predicted_class_idx} out of range")
    
    # Convert probabilities to numpy for easier manipulation
    probabilities_np = probabilities.cpu().numpy()
    
    # Get top 2 predictions
    top_indices = np.argsort(probabilities_np)[::-1][:min(2, len(probabilities_np))]
    
    # Get result type (Malign/Benign/Normal)
    result_type = CLASS_TO_RESULT.get(predicted_class, "Normal")
    
    # Generate heatmap (simplified - ViT heatmaps are more complex)
    # For now, create a simple centered heatmap
    img_array = np.array(img_original)
    img_size = img_array.shape[0] if len(img_array.shape) == 2 else img_array.shape[1]
    heatmap_colored, heatmap_raw = generate_heatmap_vit(img_original, model, inputs, predicted_class_idx)
    
    # Overlay heatmap on original image
    img_original_float = img_array.astype(np.float32) / 255.0
    heatmap_resized = cv2.resize(heatmap_colored, (img_array.shape[1], img_array.shape[0]))
    heatmap_float = heatmap_resized.astype(np.float32) / 255.0
    
    # Blend images (70% original, 30% heatmap)
    overlay = cv2.addWeighted(img_original_float, 0.7, heatmap_float, 0.3, 0)
    overlay_uint8 = (overlay * 255).astype(np.uint8)
    
    # Calculate metrics
    model_precision = float(confidence * 100)  # Top prediction confidence
    top3_predictions = [
        {
            "class": model.config.id2label[idx] if hasattr(model.config, 'id2label') and idx in model.config.id2label 
                     else (SKIN_CANCER_CLASSES[idx] if idx < len(SKIN_CANCER_CLASSES) else f"Class_{idx}"),
            "confidence": float(probabilities_np[idx] * 100),
            "result_type": CLASS_TO_RESULT.get(
                model.config.id2label[idx] if hasattr(model.config, 'id2label') and idx in model.config.id2label 
                else (SKIN_CANCER_CLASSES[idx] if idx < len(SKIN_CANCER_CLASSES) else "Normal"), 
                "Normal"
            )
        }
        for idx in top_indices
    ]
    
    # Get all predictions
    all_predictions = {}
    for i in range(len(probabilities_np)):
        class_name = model.config.id2label[i] if hasattr(model.config, 'id2label') and i in model.config.id2label else (
            SKIN_CANCER_CLASSES[i] if i < len(SKIN_CANCER_CLASSES) else f"Class_{i}"
        )
        all_predictions[class_name] = float(probabilities_np[i] * 100)
    
    # Calculate explanation and recommendations
    explanation, recommendations = get_explanation_and_recommendations(
        predicted_class, result_type, confidence * 100
    )
    
    return {
        "predicted_class": predicted_class,
        "result_type": result_type,
        "confidence": confidence * 100,
        "model_precision": model_precision,
        "top3_predictions": top3_predictions,
        "all_predictions": all_predictions,
        "heatmap": overlay_uint8,
        "heatmap_raw": heatmap_colored,
        "explanation": explanation,
        "recommendations": recommendations
    }


def get_explanation_and_recommendations(class_name, result_type, confidence):
    """
    Generate explanation and recommendations based on prediction.
    """
    explanations = {
        "actinic keratosis": "Actinic keratosis (AK) is a rough, scaly patch caused by long-term sun exposure. They are not cancer yet but have the potential to evolve into squamous cell carcinoma if untreated. Regular monitoring and sun protection are recommended.",
        "basal cell carcinoma": "Basal cell carcinoma (BCC) is the most common type of skin cancer, arising from basal cells in the epidermis. It typically appears as a pearly or waxy bump, or a flat, flesh-colored or brown scar-like lesion. BCC grows slowly and rarely spreads to distant organs, but it can cause local destruction and should be treated promptly.",
        "clear skin": "Clear skin indicates healthy, normal skin without any visible lesions or abnormalities. Continue regular skin self-examinations and maintain sun protection practices.",
        "dermatofibroma": "Dermatofibroma (DF) is a benign fibrous nodule that appears as a firm, small bump, usually on the legs or arms. It's harmless and doesn't require treatment unless it causes symptoms or changes in appearance.",
        "melanoma": "Melanoma (MEL) is the most serious type of skin cancer with strong metastatic potential. It can develop from existing moles or appear as new dark spots. Early recognition and treatment are critical as it can spread to other parts of the body if not treated early.",
        "melanoma metastasis": "Melanoma metastasis indicates that melanoma has spread beyond the original site to other parts of the body. This is a serious condition requiring immediate medical attention and specialized treatment including surgery, immunotherapy, targeted therapy, or chemotherapy.",
        "nevus": "A nevus (mole) is a common benign growth formed by nests of melanocytes. Most nevi are harmless, but changes in size, shape, color, or texture should be evaluated by a dermatologist. Regular monitoring is recommended, especially for atypical nevi.",
        "random": "The classification result is uncertain or random. This may indicate that the image quality is insufficient, the lesion is ambiguous, or the model cannot confidently classify the condition. A dermatological evaluation is recommended for proper diagnosis.",
        "seborrheic keratosis": "Seborrheic keratosis (SK) is a very common benign epidermal growth that appears as people age. These lesions are typically harmless, appearing as waxy, stuck-on patches that can vary in color from light tan to dark brown. They don't require treatment unless they cause discomfort or cosmetic concerns.",
        "solar lentigo": "Solar lentigo (age spots or liver spots) are benign pigmented lesions caused by long-term sun exposure. They appear as flat, brown or black spots, typically on sun-exposed areas. They are harmless and don't require treatment, but regular monitoring and sun protection are recommended.",
        "squamous cell carcinoma": "Squamous cell carcinoma (SCC) is a cancer of keratinocytes, more aggressive than BCC and capable of metastasis if not treated. It typically appears as a firm, red nodule or a flat lesion with a scaly, crusted surface.",
        "vascular lesion": "Vascular lesions (VASC) are benign growths arising from blood vessels, such as hemangiomas or angiomas. While visually distinct, they are not malignant and are typically harmless but should be monitored for changes in size, color, or appearance."
    }
    
    recommendations = {
        "Malign": "URGENT: Immediate consultation with a dermatologist is required. A biopsy should be performed to confirm the diagnosis.",
        "Benign": "Regular monitoring is recommended. If the lesion changes in appearance, size, color, or causes discomfort, consult with a dermatologist. ",
        "Normal": "Schedule annual dermatological check-ups as part of preventive care. Monitor any existing moles or lesions for changes."
    }
    
    explanation = explanations.get(class_name, f"{class_name} detected with {confidence:.1f}% confidence.")
    recommendation = recommendations.get(result_type, "Consult with a dermatologist for further evaluation.")
    
    return explanation, recommendation

