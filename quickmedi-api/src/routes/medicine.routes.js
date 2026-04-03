import express from 'express';
import {
  searchMedicines,
  getMedicineById,
  getMedicineAlternatives,
  askMedicineAI,
  getGenericAlternativesBulk,
  browseMedicines,
} from '../controllers/medicine.controller.js';
import { publicRateLimit } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import Joi from 'joi';

const router = express.Router();

const askSchema = Joi.object({
  question: Joi.string().min(2).max(1000).required(),
  conversationId: Joi.string().optional(),
});

const genericAlternativesSchema = Joi.object({
  medicines: Joi.array()
    .items(Joi.string().min(1).max(200))
    .min(1)
    .max(20)
    .required(),
});

router.use(publicRateLimit);

// Must come before /:id routes to avoid param matching
router.post('/generic-alternatives', validate(genericAlternativesSchema), getGenericAlternativesBulk);
router.get('/browse', browseMedicines);

router.get('/search', searchMedicines);
router.post('/:id/ask', validate(askSchema), askMedicineAI);
router.get('/:id/alternatives', getMedicineAlternatives);
router.get('/:id', getMedicineById);

export default router;
