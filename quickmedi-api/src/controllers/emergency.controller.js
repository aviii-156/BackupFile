import Emergency from '../models/Emergency.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { findEmergencyVendors } from '../services/location.service.js';
import { sendEmergencyAlertSMS, sendFamilyEmergencySMS } from '../services/sms.service.js';
import { getIO } from '../config/socket.js';

export const triggerEmergency = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { latitude, longitude, type, note } = req.body;

  const user = await User.findById(userId);

  // Find nearby emergency vendors
  const vendors = await findEmergencyVendors(latitude, longitude, 10);

  if (vendors.length === 0) {
    throw new ApiError(404, 'No emergency pharmacies found nearby');
  }

  // Create emergency alert
  const emergency = await Emergency.create({
    patientId: userId,
    patientName: user.name,
    patientPhone: user.phone,
    patientLocation: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
    type: type || 'pharmacy_alert',
    note: note || '',
    status: 'sent',
    alertedVendors: vendors.slice(0, 3).map((v) => ({
      vendorId: v._id,
      distance: v.distance,
      alertedAt: new Date(),
    })),
  });

  // Alert first 3 nearest vendors via socket and SMS
  const io = getIO();
  for (const vendor of vendors.slice(0, 3)) {
    io.to(`vendor:${vendor._id}`).emit('emergency:alert', {
      emergencyId: emergency._id,
      patientName: user.name,
      type: emergency.type,
      distance: vendor.distance,
      note: emergency.note,
    });

    sendEmergencyAlertSMS(vendor.phone, user.name, emergency.type, vendor.distance);
  }

  emergency.smsSent = true;
  await emergency.save();

  // Alert family if emergency contacts exist
  if (user.emergencyContacts && user.emergencyContacts.length > 0) {
    for (const contact of user.emergencyContacts) {
      sendFamilyEmergencySMS(contact.phone, user.name, contact.name);
    }
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        emergencyId: emergency._id,
        alertedVendors: emergency.alertedVendors.length,
        status: emergency.status,
      },
      'Emergency alert sent successfully'
    )
  );
});

export const respondToEmergency = asyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { id } = req.params;
  const { response } = req.body;

  const emergency = await Emergency.findById(id);

  if (!emergency) {
    throw new ApiError(404, 'Emergency alert not found');
  }

  // Check if vendor was alerted
  const wasAlerted = emergency.alertedVendors.some(
    (v) => v.vendorId.toString() === vendorId.toString()
  );

  if (!wasAlerted) {
    throw new ApiError(403, 'You were not alerted for this emergency');
  }

  if (emergency.status === 'responded') {
    throw new ApiError(400, 'This emergency has already been responded to');
  }

  // Update emergency
  emergency.status = response === 'accept' ? 'responded' : 'sent';
  emergency.respondedVendorId = response === 'accept' ? vendorId : null;

  if (response === 'accept') {
    const responseTime = Math.floor((new Date() - emergency.createdAt) / 1000);
    emergency.responseTime = responseTime;
  }

  await emergency.save();

  // Notify patient
  if (response === 'accept') {
    const vendor = await req.user;
    const io = getIO();
    io.to(`user:${emergency.patientId}`).emit('emergency:responded', {
      emergencyId: emergency._id,
      vendorName: vendor.name,
      vendorPhone: vendor.phone,
      vendorAddress: vendor.address,
    });
  }

  return res.status(200).json(
    new ApiResponse(200, emergency, `Emergency ${response === 'accept' ? 'accepted' : 'declined'}`)
  );
});

export const callAmbulance = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { emergencyId } = req.body;

  const emergency = await Emergency.findById(emergencyId);

  if (!emergency) {
    throw new ApiError(404, 'Emergency not found');
  }

  if (emergency.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to update this emergency');
  }

  emergency.ambulanceCalled = true;
  await emergency.save();

  // In production, integrate with ambulance service API here

  return res.status(200).json(new ApiResponse(200, emergency, 'Ambulance service notified'));
});

export const alertFamily = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { emergencyId } = req.body;

  const user = await User.findById(userId);
  const emergency = await Emergency.findById(emergencyId);

  if (!emergency) {
    throw new ApiError(404, 'Emergency not found');
  }

  if (emergency.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to update this emergency');
  }

  if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
    throw new ApiError(400, 'No emergency contacts configured');
  }

  // Send SMS to all emergency contacts
  for (const contact of user.emergencyContacts) {
    sendFamilyEmergencySMS(contact.phone, user.name, contact.name);
  }

  emergency.smsFallback = true;
  await emergency.save();

  return res.status(200).json(new ApiResponse(200, null, 'Family members alerted'));
});

export const getEmergencyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const emergency = await Emergency.findById(id).populate('respondedVendorId', 'name phone address location');

  if (!emergency) {
    throw new ApiError(404, 'Emergency not found');
  }

  if (emergency.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to view this emergency');
  }

  return res.status(200).json(new ApiResponse(200, emergency, 'Emergency status retrieved'));
});

export const resolveEmergency = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const emergency = await Emergency.findById(id);

  if (!emergency) {
    throw new ApiError(404, 'Emergency not found');
  }

  if (emergency.patientId.toString() !== userId.toString()) {
    throw new ApiError(403, 'You are not authorized to resolve this emergency');
  }

  emergency.status = 'resolved';
  emergency.resolvedAt = new Date();
  await emergency.save();

  return res.status(200).json(new ApiResponse(200, emergency, 'Emergency resolved'));
});
