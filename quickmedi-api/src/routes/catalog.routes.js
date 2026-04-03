/**
 * catalog.routes.js
 * Medicine catalog routes – search the medicines_db catalog and add to vendor inventory.
 */
import express from 'express';
import { searchCatalog, getCatalogItem, addCatalogItemToInventory } from '../controllers/catalog.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Public catalog search (vendors and admins only in production, but
 * the search itself returns catalog data – no patient data exposed).
 * Require auth for vendor-specific write operations.
 */

// GET /api/catalog/search?q=augmentin&form=tablet&therapeutic_class=antibiotic&page=1
router.get('/search', authenticate, requireRole('vendor', 'admin', 'superadmin'), searchCatalog);

// GET /api/catalog/:productId
router.get('/:productId', authenticate, requireRole('vendor', 'admin', 'superadmin'), getCatalogItem);

// POST /api/catalog/:productId/add-to-inventory  (vendor only)
router.post(
  '/:productId/add-to-inventory',
  authenticate,
  requireRole('vendor'),
  addCatalogItemToInventory
);

export default router;
