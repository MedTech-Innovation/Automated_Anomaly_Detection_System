"""
Lung/Pneumonia Detection Module
Handles loading and using the Vision Transformer (ViT) model for pneumonia detection.
Uses transformers library with PyTorch backend.
"""

import os
import numpy as np
import cv2
from PIL import Image
import torch
from transformers import ViTImageProcessor, ViTForImageClassification

# 2 classes for pneumonia detection (from model config)
CLASS_NAMES = [
    'normal',      # Label 0 - Normal lung
    'pneumonia'    # Label 1 - Pneumonia detected
]

# Map classes to result types (Malign/Benign/Normal)
CLASS_TO_RESULT = {
    "normal": "Normal",
    "pneumonia": "Malign"  # Pneumonia requires medical attention
}

# Model configuration
# Local model path for pneumonia detection
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model", "pneumonia")
MODEL_SAFETENSORS = os.path.join(MODEL_PATH, "model.safetensors")
# Image size from config.json: 224x224
IMG_SIZE = 224  # Model expects 224x224 images (from config.json)

# Global model variables
lung_model = None
processor = None
device = None


def load_lung_model():
    """Load the Vision Transformer model and processor from local file."""
    global lung_model, processor, device
    
    if lung_model is None:
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
            
            # Load from local directory with memory optimization
            print(f"Loading ViT model and processor from local directory: {MODEL_PATH}")
            
            # Clear any cached memory before loading
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            # Load processor first (lightweight)
            processor = ViTImageProcessor.from_pretrained(MODEL_PATH)
            
            # Load model with low memory usage option
            try:
                lung_model = ViTForImageClassification.from_pretrained(
                    MODEL_PATH,
                    low_cpu_mem_usage=True,
                    torch_dtype=torch.float32
                )
            except (OSError, MemoryError) as mem_error:
                # If memory error, try with even more aggressive settings
                print(f"Initial load failed with memory error, trying with optimized settings: {mem_error}")
                import gc
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                
                # Try loading with half precision if CUDA is available
                if torch.cuda.is_available():
                    lung_model = ViTForImageClassification.from_pretrained(
                        MODEL_PATH,
                        low_cpu_mem_usage=True,
                        torch_dtype=torch.float16
                    )
                else:
                    # For CPU, try loading in chunks or raise error with helpful message
                    raise RuntimeError(
                        f"Insufficient memory to load lung detection model. "
                        f"Error: {str(mem_error)}\n"
                        f"Please try:\n"
                        f"1. Close other applications to free memory\n"
                        f"2. Increase virtual memory/page file size in Windows\n"
                        f"3. Restart the application\n"
                        f"4. Use a machine with more RAM"
                    )
            
            # Set device (CUDA, MPS, or CPU)
            device = torch.device(
                "cuda" if torch.cuda.is_available() 
                else "mps" if torch.backends.mps.is_available() 
                else "cpu"
            )
            
            # Move model to device
            try:
                lung_model = lung_model.to(device)
            except RuntimeError as e:
                # If moving to device fails due to memory, try CPU
                if "out of memory" in str(e).lower() or "memory" in str(e).lower():
                    print(f"Warning: Failed to move model to {device} due to memory, using CPU instead")
                    device = torch.device("cpu")
                    lung_model = lung_model.to(device)
                else:
                    raise
            
            lung_model.eval()
            
            print(f"Lung detection model loaded successfully on device: {device}")
            if hasattr(lung_model, 'config'):
                print(f"Model config: {lung_model.config}")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Failed to load lung detection model: {str(e)}")
    
    return lung_model, processor, device


def preprocess_image(image_file, processor):
    """
    Preprocess image using ViTImageProcessor.
    The processor will resize to 224x224 and normalize according to preprocessor_config.json.
    
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
    # - Resize to 224x224 (from preprocessor_config.json)
    # - Normalize with mean=[0.5, 0.5, 0.5] and std=[0.5, 0.5, 0.5]
    # - Rescale by 1/255 (0.00392156862745098)
    inputs = processor(images=img, return_tensors="pt")
    
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


def predict_lung_condition(image_file):
    """
    Predict lung condition (normal/pneumonia) from an image using Vision Transformer.
    Args:
        image_file: File object or image path
    Returns:
        Dictionary with predictions, confidence, heatmap, and metrics
    """
    model, processor, device = load_lung_model()
    
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
        if predicted_class_idx < len(CLASS_NAMES):
            predicted_class = CLASS_NAMES[predicted_class_idx]
        else:
            predicted_class = f"Class_{predicted_class_idx}"
            print(f"Warning: Predicted class index {predicted_class_idx} out of range")
    
    # Convert probabilities to numpy for easier manipulation
    probabilities_np = probabilities.cpu().numpy()
    
    # Get top 2 predictions (or all if less than 2)
    top_indices = np.argsort(probabilities_np)[::-1][:min(2, len(probabilities_np))]
    
    # Get result type (Malign/Benign/Normal)
    result_type = CLASS_TO_RESULT.get(predicted_class, "Normal")
    
    # Generate heatmap
    img_array = np.array(img_original)
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
                     else (CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else f"Class_{idx}"),
            "confidence": float(probabilities_np[idx] * 100),
            "result_type": CLASS_TO_RESULT.get(
                model.config.id2label[idx] if hasattr(model.config, 'id2label') and idx in model.config.id2label 
                else (CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else "Normal"), 
                "Normal"
            )
        }
        for idx in top_indices
    ]
    
    # Get all predictions
    all_predictions = {}
    for i in range(len(probabilities_np)):
        class_name = model.config.id2label[i] if hasattr(model.config, 'id2label') and i in model.config.id2label else (
            CLASS_NAMES[i] if i < len(CLASS_NAMES) else f"Class_{i}"
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
        "normal": "The chest X-ray appears normal with no signs of pneumonia. The lung fields are clear, and there are no visible infiltrates, consolidations, or other abnormalities typically associated with pneumonia.",
        "pneumonia": f"Pneumonia has been detected in the chest X-ray with {confidence:.1f}% confidence. Pneumonia is an infection that inflames air sacs in one or both lungs, which may fill with fluid. The X-ray shows signs of lung inflammation, consolidation, or infiltrates characteristic of pneumonia."
    }
    
    recommendations = {
        "Malign": "URGENT: Immediate medical attention is required. Pneumonia is a serious condition that requires prompt treatment with antibiotics (for bacterial pneumonia) or antiviral medications (for viral pneumonia). Please consult with a pulmonologist or emergency care provider immediately. Follow-up chest X-rays may be needed to monitor treatment progress.",
        "Normal": "The chest X-ray shows no signs of pneumonia. Continue regular health monitoring. If you experience symptoms such as persistent cough, fever, chest pain, or difficulty breathing, consult with a healthcare provider. Annual check-ups are recommended for maintaining lung health."
    }
    
    explanation = explanations.get(class_name, f"{class_name} detected with {confidence:.1f}% confidence.")
    recommendation = recommendations.get(result_type, "Consult with a pulmonologist for further evaluation.")
    
    return explanation, recommendation

