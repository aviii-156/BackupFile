import express from 'express';
import {
  getNearbyStores,
  getStoreById,
  getStoreInventory,
  compareMedicinePrices,
  searchByMedicineNames,
} from '../controllers/store.controller.js';
import { publicRateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

router.use(publicRateLimit);

router.get('/nearby', getNearbyStores);
router.get('/compare', compareMedicinePrices);
router.post('/search-by-medicines', searchByMedicineNames);
router.get('/:id', getStoreById);
router.get('/:id/inventory', getStoreInventory);

export default router;
