import express from 'express';
import {
  uploadPrescription,
  getPrescriptionById,
  getPrescriptionHistory,
  deletePrescription,
  scanPrescription,
} from '../controllers/prescription.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { upload, uploadImage } from '../middleware/upload.middleware.js';
import { authRateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

// Public OCR scan – file stays in memory, never uploaded to Cloudinary
router.post('/scan', upload.single('file'), scanPrescription);

router.use(authenticate);
router.use(requireRole('patient'));
router.use(authRateLimit);

router.post('/upload', upload.single('prescription'), uploadImage('prescriptions'), uploadPrescription);
router.get('/history', getPrescriptionHistory);
router.get('/:id', getPrescriptionById);
router.delete('/:id', deletePrescription);

export default router;
