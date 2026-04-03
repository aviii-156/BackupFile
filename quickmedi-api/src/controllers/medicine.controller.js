import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import Medicine from '../models/Medicine.js';
import MedicineCatalog from '../models/MedicineCatalog.js';
import VendorInventory from '../models/VendorInventory.js';
import Vendor from '../models/Vendor.js';
import * as aiService from '../services/ai.service.js';
import Joi from 'joi';

/**
 * @route   POST /api/medicine/:id/ask
 * @desc    Ask an AI question about a specific medicine
 * @access  Public
 */
export const askMedicineAI = asyncHandler(async (req, res) => {
  const { id } = req.params;         // medicine name or id
  const { question, conversationId } = req.body;

  if (!question || question.trim().length < 2) {
    throw new ApiError(400, 'Question must be at least 2 characters');
  }

  // Fetch medicine data from AI service to pass as context
  let medicineData = null;
  try {
    const details = await aiService.getMedicineDetails(id);
    if (details && details.medicine) {
      medicineData = details.medicine;
    }
  } catch {
    // Non-fatal – AI can still answer without db context
  }

  const aiResponse = await aiService.askAboutMedicine(
    id,
    question.trim(),
    medicineData,
    conversationId || null
  );

  return apiResponse(res, 200, 'AI response generated', {
    medicine: id,
    response: aiResponse.response,
    suggestions: aiResponse.suggestions || [],
    followUpQuestions: aiResponse.follow_up_questions || [],
    conversationId: aiResponse.conversation_id,
  });
});

/**
 * @route   GET /api/medicine/search
 * @desc    Search medicines (forwarded to AI API)
 * @access  Public
 */
export const searchMedicines = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    throw new ApiError(400, 'Search query must be at least 2 characters');
  }

  // Forward search to Python AI API
  const aiResponse = await aiService.searchMedicines(q);
  
  // Return AI API response
  return apiResponse(res, 200, 'Search results', {
    query: aiResponse.query || q,
    results: aiResponse.results || [],
    count: aiResponse.results?.length || 0,
    source: 'ai-service'
  });
});

/**
 * @route   GET /api/medicine/:name
 * @desc    Get medicine details (forwarded to AI API)
 * @access  Public
 */
export const getMedicineById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Forward to Python AI API using medicine name
  const aiResponse = await aiService.getMedicineDetails(id);
  
  if (!aiResponse.success) {
    throw new ApiError(404, 'Medicine not found');
  }

  return apiResponse(res, 200, 'Medicine details', {
    medicine: aiResponse.medicine,
    source: 'ai-service'
  });
});

/**
 * @route   GET /api/medicine/:name/alternatives
 * @desc    Get medicine alternatives (forwarded to AI API)
 * @access  Public
 */
export const getMedicineAlternatives = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Forward to Python AI API using medicine name
  const aiResponse = await aiService.getMedicineAlternativesAI(id);
  
  if (!aiResponse.success) {
    throw new ApiError(404, 'Medicine not found');
  }

  return apiResponse(res, 200, 'Alternatives found', {
    original: aiResponse.original,
    alternatives: aiResponse.alternatives,
    count: aiResponse.alternatives?.length || 0,
    source: 'ai-service'
  });
});

/**
 * @route   POST /api/medicine/generic-alternatives
 * @desc    Find generic equivalents + cheaper brand alternatives for detected medicines
 * @access  Public
 */
export const getGenericAlternativesBulk = asyncHandler(async (req, res) => {
  const { medicines } = req.body;

  if (!Array.isArray(medicines) || medicines.length === 0) {
    throw new ApiError(400, 'medicines must be a non-empty array');
  }

  const aiResponse = await aiService.findGenericAlternativesBulk(medicines);

  return apiResponse(res, 200, 'Generic alternatives found', {
    results: aiResponse.results ?? [],
    total_prescription_savings: aiResponse.total_prescription_savings ?? 0,
    source: 'ai-service',
  });
});

// ---------------------------------------------------------------------------
// Helper: normalise a medicine name for deduplication
// ---------------------------------------------------------------------------
function normaliseKey(name = '') {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

// ---------------------------------------------------------------------------
// browseMedicines
// GET /api/medicine/browse
// Query params:
//   q        – search term (optional)
//   filter   – "all" | "generic" | "non-generic" | "nearby"  (default: "all")
//   lat, lon – required when filter === "nearby"
//   radius   – km radius for nearby (default 10)
//   page     – 1-based (default 1)
//   limit    – max results per page (default 40, capped at 100)
// ---------------------------------------------------------------------------
export const browseMedicines = asyncHandler(async (req, res) => {
  const {
    q = '',
    filter = 'all',
    lat,
    lon,
    radius = 10,
    page = 1,
    limit = 40,
  } = req.query;

  const search   = q.trim();
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(Math.max(1, Number(limit)), 100);
  const skip     = (pageNum - 1) * limitNum;

  const textRx = search ? new RegExp(search, 'i') : null;

  // ── 1. VendorInventory ────────────────────────────────────────────────────
  let nearbyVendorIds = null;

  if (filter === 'nearby') {
    if (!lat || !lon) throw new ApiError(400, 'lat and lon are required for nearby filter');

    const nearbyVendors = await Vendor.find({
      approvalStatus: 'approved',
      isActive: true,
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lon), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    }).select('_id').lean();

    nearbyVendorIds = nearbyVendors.map((v) => v._id);
    if (nearbyVendorIds.length === 0) {
      return apiResponse(res, 200, 'No nearby vendors found', { medicines: [], total: 0 });
    }
  }

  const invQuery = { isAvailable: true, isExpired: false, stock: { $gt: 0 } };
  if (nearbyVendorIds) invQuery.vendorId = { $in: nearbyVendorIds };
  if (textRx) {
    invQuery.$or = [
      { medicineName: textRx },
      { genericName: textRx },
      { composition: textRx },
    ];
  }

  const invDocs = await VendorInventory.find(invQuery)
    .populate('vendorId', 'storeName pharmacyName businessName approvalStatus isActive rating deliveryAvailable deliveryCharge')
    .lean();

  const validInv = invDocs.filter(
    (i) => i.vendorId && i.vendorId.approvalStatus === 'approved' && i.vendorId.isActive !== false
  );

  const seenKeys = new Set();
  const vendorMeds = [];

  validInv.forEach((inv) => {
    const key = normaliseKey(inv.medicineName);
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    const storeLabel =
      inv.vendorId?.pharmacyName ||
      inv.vendorId?.businessName ||
      inv.vendorId?.storeName ||
      'Store';
    vendorMeds.push({
      medicineId:        inv.medicineId?.toString() || null,
      inventoryId:       inv._id.toString(),
      name:              inv.medicineName,
      genericName:       inv.genericName,
      composition:       inv.composition,
      form:              inv.form || '',
      category:          inv.category || 'other',
      manufacturer:      inv.manufacturer || '',
      price:             inv.vendorPrice ?? inv.mrp,
      mrp:               inv.mrp,
      discount:          inv.discount ?? 0,
      unit:              inv.unit || 'strip',
      stockStatus:       inv.stock > (inv.lowStockThreshold || 10) ? 'in_stock' : 'low_stock',
      requiresPrescription: false,
      generic:           false,
      source:            'vendorInventory',
      availableVendorId: inv.vendorId?._id?.toString() || null,
      storeName:         storeLabel,
      storeRating:       inv.vendorId?.rating ?? null,
      deliveryAvailable: inv.vendorId?.deliveryAvailable ?? false,
      deliveryCharge:    inv.vendorId?.deliveryCharge ?? 0,
    });
  });

  // ── Early exit for "nearby" ───────────────────────────────────────────────
  if (filter === 'nearby') {
    return apiResponse(res, 200, 'Nearby medicines', {
      medicines: vendorMeds.slice(skip, skip + limitNum),
      total: vendorMeds.length,
      filter,
      page: pageNum,
    });
  }

  // ── 2. Medicine collection (generic) ─────────────────────────────────────
  const genericMeds = [];

  if (filter !== 'non-generic') {
    const medicineQuery = { approvalStatus: 'approved', isActive: true };
    if (textRx) {
      medicineQuery.$or = [
        { name: textRx },
        { genericName: textRx },
        { composition: textRx },
      ];
    }

    const medicineDocs = await Medicine.find(medicineQuery)
      .select('_id name genericName composition form category manufacturer mrp averageMarketPrice requiresPrescription isGeneric')
      .lean();

    medicineDocs.forEach((m) => {
      const key = normaliseKey(m.name);
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);
      genericMeds.push({
        medicineId:        m._id.toString(),
        inventoryId:       null,
        name:              m.name,
        genericName:       m.genericName,
        composition:       m.composition,
        form:              m.form || '',
        category:          m.category || 'other',
        manufacturer:      m.manufacturer || '',
        price:             m.mrp ?? m.averageMarketPrice ?? 0,
        mrp:               m.mrp ?? m.averageMarketPrice ?? 0,
        discount:          0,
        unit:              'strip',
        stockStatus:       'available',
        requiresPrescription: m.requiresPrescription ?? false,
        generic:           true,
        source:            'generic',
        availableVendorId: null,
      });
    });
  }

  // ── 3. "generic" filter — paginate in memory and return ──────────────────
  if (filter === 'generic') {
    return apiResponse(res, 200, 'Generic medicines', {
      medicines: genericMeds.slice(skip, skip + limitNum),
      total: genericMeds.length,
      filter,
      page: pageNum,
    });
  }

  // ── 4. MedicineCatalog — DB-level pagination ──────────────────────────────
  // "all"         → fixedMeds = vendorMeds + genericMeds
  // "non-generic" → fixedMeds = vendorMeds only
  const fixedMeds  = filter === 'non-generic' ? vendorMeds : [...vendorMeds, ...genericMeds];
  const fixedTotal = fixedMeds.length;

  const catQuery = {};
  if (textRx) {
    catQuery.$or = [
      { brand_name: textRx },
      { primary_ingredient: textRx },
      { manufacturer: textRx },
    ];
  }

  // How much of this page comes from fixedMeds vs catalog?
  const fixedInPage   = Math.max(0, Math.min(limitNum, fixedTotal - skip));
  const catSkip       = Math.max(0, skip - fixedTotal);
  const catLimitNeeded = limitNum - fixedInPage;

  // Run count + catalog fetch in parallel
  const [catTotal, catDocs] = await Promise.all([
    MedicineCatalog.countDocuments(catQuery),
    catLimitNeeded > 0
      ? MedicineCatalog.find(catQuery)
          .select('_id product_id brand_name manufacturer price dosage_form packaging primary_ingredient')
          .skip(catSkip)
          .limit(catLimitNeeded)
          .lean()
      : Promise.resolve([]),
  ]);

  const total = fixedTotal + catTotal;

  // In-memory dedup for the fetched catalog slice against vendor/generic keys
  const catalogPage = catDocs
    .filter((c) => {
      const key = normaliseKey(c.brand_name);
      return key && !seenKeys.has(key);
    })
    .map((c) => ({
      medicineId:        null,
      inventoryId:       null,
      catalogProductId:  c.product_id,
      name:              c.brand_name,
      genericName:       c.primary_ingredient || '',
      composition:       c.primary_ingredient || '',
      form:              c.dosage_form || '',
      category:          'other',
      manufacturer:      c.manufacturer || '',
      price:             c.price ?? 0,
      mrp:               c.price ?? 0,
      discount:          0,
      unit:              c.packaging || 'strip',
      stockStatus:       'available',
      requiresPrescription: false,
      generic:           false,
      source:            'medicine_db',
      availableVendorId: null,
    }));

  return apiResponse(res, 200, 'Medicines fetched', {
    medicines: [...fixedMeds.slice(skip, skip + fixedInPage), ...catalogPage],
    total,
    filter,
    page: pageNum,
  });
});

export default {
  searchMedicines,
  getMedicineById,
  getMedicineAlternatives,
  askMedicineAI,
  getGenericAlternativesBulk,
  browseMedicines,
};
