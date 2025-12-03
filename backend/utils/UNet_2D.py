import keras
from keras.layers import *
from keras.models import *
import keras.backend as K
import tensorflow as tf
from utils.variables import best_weights_path, IMG_SIZE
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import warnings
warnings.filterwarnings("ignore")


# Compute metric between the predicted segmentation and the ground truth

# Compute Precision - Measure the proportion of predicted positive pixels that are actually positive
def precision(y_true, y_pred):
    true_positives = K.sum(K.round(K.clip(y_true * y_pred, 0, 1)))
    predicted_positives = K.sum(K.round(K.clip(y_pred, 0, 1)))
    precision = true_positives / (predicted_positives + K.epsilon())
    return precision


# Compute Sensitivity - Measure the proportion of positive ground truth pixels that were correctly predicted
def sensitivity(y_true, y_pred):
    true_positives = K.sum(K.round(K.clip(y_true * y_pred, 0, 1)))
    possible_positives = K.sum(K.round(K.clip(y_true, 0, 1)))
    return true_positives / (possible_positives + K.epsilon())


# Compute specificity - Measure the proportion of predicted negative pixels that were actually negative
def specificity(y_true, y_pred):
    true_negatives = K.sum(K.round(K.clip((1 - y_true) * (1 - y_pred), 0, 1)))
    possible_negatives = K.sum(K.round(K.clip(1 - y_true, 0, 1)))
    return true_negatives / (possible_negatives + K.epsilon())


# Compute Dice Coef - Measure the overlap between y_true and y_pred
def dice_coef(y_true, y_pred, smooth=1.0):
    class_num = 4
    for i in range(class_num):
        y_true_f = K.flatten(y_true[:, :, :, i])
        y_pred_f = K.flatten(y_pred[:, :, :, i])
        intersection = K.sum(y_true_f * y_pred_f)
        loss = ((2. * intersection + smooth) / (K.sum(y_true_f) + K.sum(y_pred_f) + smooth))
        if i == 0:
            total_loss = loss
        else:
            total_loss = total_loss + loss
    total_loss = total_loss / class_num
    return total_loss

def init_model():
    ############ load trained model ################
    model = keras.models.load_model('C:/Users/Home/OneDrive - Groupe ESAIP/Project-Management/Project-Team5/MedTech-Innovation-Software/MedTech/backend/utils/model_x81_dcs65.h5', 
                                    custom_objects={ 'accuracy' : tf.keras.metrics.MeanIoU(num_classes=4),
                                                    "dice_coef": dice_coef,
                                                    "precision": precision,
                                                    "sensitivity":sensitivity,
                                                    "specificity":specificity,
                                                    }, compile=False)
    return model

