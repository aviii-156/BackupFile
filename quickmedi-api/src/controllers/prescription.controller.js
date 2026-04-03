import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import Prescription from '../models/Prescription.js';
import User from '../models/User.js';
import PlatformStats from '../models/PlatformStats.js';
import Medicine from '../models/Medicine.js';
import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/env.js';
import {
  processPrescriptionOCR,
  getMedicineAlternatives,
  checkDrugInteractions,
  checkDuplicateMedicines,
  performSafetyCheck,
} from '../services/ai.service.js';
import { findBestVendorForPrescription } from '../services/location.service.js';
import { sendPrescriptionReadyNotification } from '../services/notification.service.js';
import { getIO } from '../config/socket.js';

/**
 * @route   POST /api/prescription/upload
 * @desc    Upload and process prescription
 * @access  Private (Patient)
 */
export const uploadPrescription = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const user = await User.findById(userId);

  // Check daily scan limit (free users)
  if (user.subscription === 'free') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.dailyScans && user.dailyScans.date) {
      const scanDate = new Date(user.dailyScans.date);
      scanDate.setHours(0, 0, 0, 0);

      if (scanDate.getTime() === today.getTime()) {
        // Same day
        if (user.dailyScans.count >= 3) {
          throw new ApiError(403, 'Daily scan limit reached. Upgrade to Pro for unlimited scans.', 'SCAN_LIMIT_EXCEEDED');
        }
      } else {
        // New day - reset count
        user.dailyScans = { date: today, count: 0 };
      }
    } else {
      user.dailyScans = { date: today, count: 0 };
    }
  }

  // Check if image was uploaded
  if (!req.uploadedImageUrl) {
    throw new ApiError(400, 'Prescription image is required');
  }

  const imageUrl = req.uploadedImageUrl;

  // Create prescription document
  const prescription = await Prescription.create({
    userId,
    imageUrl,
    status: 'processing',
  });

  // Increment daily scan count
  if (user.subscription === 'free') {
    user.dailyScans.count += 1;
  }
  user.totalPrescriptions += 1;
  await user.save();

  // Return immediately with prescription ID
  res.status(201).json({
    success: true,
    message: 'Prescription uploaded. Processing started.',
    data: {
      prescriptionId: prescription._id,
      status: 'processing',
    },
  });

  // Process prescription asynchronously
  processPrescriptionAsync(prescription._id, imageUrl, userId, user).catch(error => {
    console.error('Prescription processing error:', error);
  });
});

/**
 * Async function to process prescription
 */
const processPrescriptionAsync = async (prescriptionId, imageUrl, userId, user) => {
  try {
    const prescription = await Prescription.findById(prescriptionId);

    // Convert image to base64 (assuming imageUrl is accessible)
    // For simplicity, we'll pass the URL and let AI service handle it
    // In production, you'd download and convert to base64

    // Step 1: OCR Processing
    const ocrResult = await processPrescriptionOCR(imageUrl);

    prescription.doctorName = ocrResult.doctorName;
    prescription.prescriptionDate = ocrResult.prescriptionDate;
    prescription.patientName = ocrResult.patientName;
    prescription.detectedMedicines = ocrResult.medicines || [];

    // Match detected medicines with database
    for (let med of prescription.detectedMedicines) {
      const matchedMedicine = await Medicine.findOne({
        $or: [
          { name: new RegExp(med.name, 'i') },
          { genericName: new RegExp(med.name, 'i') },
        ],
        approvalStatus: 'approved',
      });

      if (matchedMedicine) {
        med.medicineId = matchedMedicine._id;
      }
    }

    // Get medicine names for AI checks
    const medicineNames = prescription.detectedMedicines.map(m => m.name);
    const medicineIds = prescription.detectedMedicines
      .filter(m => m.medicineId)
      .map(m => m.medicineId);

    // Run AI checks in parallel
    const [alternativesResults, interactionsResult, duplicatesResult, safetyResult] = await Promise.all([
      // Get alternatives for each medicine
      Promise.all(
        prescription.detectedMedicines.map(async (med) => {
          try {
            const altResult = await getMedicineAlternatives(med.name, '');
            return {
              originalMedicineName: med.name,
              alternatives: altResult.alternatives || [],
            };
          } catch (error) {
            return { originalMedicineName: med.name, alternatives: [] };
          }
        })
      ),

      // Check interactions
      checkDrugInteractions(medicineNames).catch(() => ({ interactions: [] })),

      // Check duplicates
      checkDuplicateMedicines(medicineNames).catch(() => ({ duplicates: [] })),

      // Safety check
      performSafetyCheck(
        prescription.detectedMedicines.map(m => m.name)
      ).catch(() => ({ safetyChecks: [] })),
    ]);

    prescription.alternatives = alternativesResults;
    prescription.interactions = interactionsResult.interactions || [];
    prescription.duplicates = duplicatesResult.duplicates || [];
    prescription.safetyChecks = safetyResult.safetyChecks || [];

    // Calculate costs
    const originalCost = medicineIds.length * 100; // Placeholder
    const optimizedCost = originalCost * 0.7; // 30% savings placeholder
    const saved = originalCost - optimizedCost;

    prescription.costs = {
      original: originalCost,
      optimized: optimizedCost,
      saved,
    };

    // Determine overall safety
    const hasDangerousInteraction = prescription.interactions.some(i => i.severity === 'dangerous');
    const hasDangerousSafety = prescription.safetyChecks.some(s => s.status === 'danger');

    if (hasDangerousInteraction || hasDangerousSafety) {
      prescription.overallSafety = 'danger';
    } else if (prescription.interactions.some(i => i.severity === 'moderate')) {
      prescription.overallSafety = 'warning';
    } else {
      prescription.overallSafety = 'safe';
    }

    // Find best vendor
    if (user.savedAddresses && user.savedAddresses.length > 0 && medicineIds.length > 0) {
      const defaultAddress = user.savedAddresses.find(a => a.isDefault) || user.savedAddresses[0];
      if (defaultAddress && defaultAddress.location) {
        const [lng, lat] = defaultAddress.location.coordinates;
        const bestVendor = await findBestVendorForPrescription(medicineIds, lat, lng);
        if (bestVendor) {
          prescription.recommendedStore = bestVendor;
        }
      }
    }

    prescription.status = 'complete';
    await prescription.save();

    // Update user total saved
    user.totalSaved += saved;
    await user.save();

    // Update platform stats atomically
    await PlatformStats.findOneAndUpdate(
      {},
      {
        $inc: {
          totalSavingsGenerated: saved,
          totalPrescriptionsProcessed: 1,
        },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true }
    );

    // Socket emit prescription ready
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('prescription:ready', {
        prescriptionId: prescription._id,
        savings: saved,
        interactionCount: prescription.interactions.length,
        status: prescription.overallSafety,
      });

      // Push notification
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        const tokens = user.fcmTokens.map(t => t.token);
        await sendPrescriptionReadyNotification(tokens, prescription._id, saved);
      }
    } catch (error) {
      console.error('Notification error:', error);
    }
  } catch (error) {
    console.error('Prescription processing failed:', error);

    // Update prescription status to failed
    await Prescription.findByIdAndUpdate(prescriptionId, {
      status: 'failed',
    });
  }
};

/**
 * @route   GET /api/prescription/:id
 * @desc    Get prescription details
 * @access  Private (Patient)
 */
export const getPrescriptionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const prescription = await Prescription.findById(id);

  if (!prescription) {
    throw new ApiError(404, 'Prescription not found');
  }

  // Check ownership
  if (prescription.userId.toString() !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  return apiResponse(res, 200, 'Prescription details', { prescription });
});

/**
 * @route   GET /api/prescription/history
 * @desc    Get prescription history
 * @access  Private (Patient)
 */
export const getPrescriptionHistory = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { page = 1, limit = 10 } = req.query;

  const prescriptions = await Prescription.find({ userId })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .select('imageUrl status costs createdAt overallSafety detectedMedicines');

  const total = await Prescription.countDocuments({ userId });

  return apiResponse(res, 200, 'Prescription history', {
    prescriptions,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

/**
 * @route   DELETE /api/prescription/:id
 * @desc    Delete prescription
 * @access  Private (Patient)
 */
export const deletePrescription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  const prescription = await Prescription.findById(id);

  if (!prescription) {
    throw new ApiError(404, 'Prescription not found');
  }

  if (prescription.userId.toString() !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  await prescription.deleteOne();

  return apiResponse(res, 200, 'Prescription deleted');
});

/**
 * @route   POST /api/prescription/scan
 * @desc    Forward prescription image to the AI service for OCR + medicine extraction
 * @access  Public (no auth required – scan before login is allowed)
 */
export const scanPrescription = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Image file is required');

  // Forward the file as multipart to the AI server's parse endpoint (same as Postman)
  const form = new FormData();
  form.append('file', req.file.buffer, {
    filename: req.file.originalname || 'prescription.jpg',
    contentType: req.file.mimetype || 'image/jpeg',
  });

  let aiData;
  try {
    const aiRes = await axios.post(
      `${config.aiServiceUrl}/api/ocr/parse-prescription`,
      form,
      { headers: form.getHeaders(), timeout: 60000 },
    );
    aiData = aiRes.data;
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail ?? err.message;
    throw new ApiError(
      status === 400 ? 400 : 503,
      status === 400 ? detail : `AI service unavailable: ${detail}`,
    );
  }

  // Response shape: { success, prescription: { doctor_info, patient_info, medicines, date, ... } }
  const rx = aiData.prescription ?? aiData;
  const doctorInfo = rx.doctor_info ?? {};
  const patientInfo = rx.patient_info ?? {};

  const medicines = (rx.medicines ?? []).map((m) => ({
    name: m.name ?? m.medicine_name ?? '',
    dosage: m.dosage ?? null,
    frequency: m.frequency ?? null,
    duration: m.duration ?? null,
    confidence: typeof m.confidence === 'number' ? m.confidence : 0.85,
  })).filter((m) => m.name);

  return apiResponse(res, 200, 'Prescription scanned', {
    doctorName: doctorInfo.name ?? doctorInfo.doctor_name ?? null,
    patientName: patientInfo.name ?? patientInfo.patient_name ?? null,
    prescriptionDate: rx.date ?? null,
    diagnosis: rx.diagnosis ?? null,
    instructions: rx.instructions ?? null,
    medicines,
  });
});

export default {
  uploadPrescription,
  getPrescriptionById,
  getPrescriptionHistory,
  deletePrescription,
  scanPrescription,
};
