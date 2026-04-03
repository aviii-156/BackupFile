"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Store,
  Upload,
  CheckCircle,
  FileText,
  MapPin,
  Clock,
  Truck,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";

interface VendorRegistrationProps {
  email?: string;
}

export default function VendorRegistration({ email = "" }: VendorRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Controlled form state for required fields
  const [formData, setFormData] = useState({
    storeName: "",
    ownerName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    gstNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    latitude: "",
    longitude: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [storePhoto, setStorePhoto] = useState<File | null>(null);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setIsLocating(false);
      },
      () => setIsLocating(false)
    );
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!formData.password || formData.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters. Please update it in Step 1.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match. Please update them in Step 1.");
      return;
    }
    if (!licenseFile) {
      setErrorMessage("License document is required. Please upload it in Step 3.");
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      setErrorMessage("Please set location coordinates in Step 2.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("storeName", formData.storeName);
      fd.append("ownerName", formData.ownerName);
      fd.append("phone", formData.phone);
      fd.append("password", formData.password);
      fd.append("licenseNumber", formData.licenseNumber);
      if (formData.gstNumber) fd.append("gstNumber", formData.gstNumber);
      fd.append("addressLine1", formData.addressLine1);
      if (formData.addressLine2) fd.append("addressLine2", formData.addressLine2);
      fd.append("city", formData.city);
      fd.append("state", formData.state);
      fd.append("pincode", formData.pincode);
      fd.append("latitude", formData.latitude);
      fd.append("longitude", formData.longitude);
      fd.append("documents", licenseFile);
      if (gstFile) fd.append("documents", gstFile);
      if (storePhoto) fd.append("documents", storePhoto);
      const res = await authService.registerVendor(fd);
      if (res.success) {
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMessage(res.message || "Registration failed. Please try again.");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-md shadow-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Thank You for Registering!
          </h1>
          <p className="text-lg text-gray-600">
            Your application has been submitted successfully.
          </p>
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-md">
            <p className="text-gray-700">
              <strong className="text-blue-800">What&apos;s Next?</strong>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Our team will review your application and verify your documents
              within 24-48 hours. You will receive an email notification once
              your store is verified and approved.
            </p>
          </div>
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => (window.location.href = "/login")}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Go to Login
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Progress Steps */}
      <div className="bg-white rounded-md p-6 border shadow-sm">
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: "Basic Info", icon: Store },
            { step: 2, label: "Store & Address", icon: MapPin },
            { step: 3, label: "Documents", icon: FileText },
            { step: 4, label: "Services", icon: Truck },
            { step: 5, label: "Review", icon: CheckCircle },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors",
                    currentStep >= item.step
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {currentStep > item.step ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    item.step
                  )}
                </div>
                <p className="text-xs font-medium mt-2 text-center">
                  {item.label}
                </p>
              </div>
              {index < 4 && (
                <div
                  className={cn(
                    "h-1 flex-1 mx-2 rounded transition-colors",
                    currentStep > item.step ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="bg-white rounded-md max-h-[60vh] overflow-y-scroll p-6 border shadow-sm">
          <h3 className="font-semibold text-lg mb-6">Basic Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium">
                  Store Name *
                </label>
                <Input placeholder="Enter your pharmacy name" value={formData.storeName} onChange={(e) => handleFieldChange("storeName", e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  Legal name of your pharmacy
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Owner Name *
                </label>
                <Input placeholder="Enter owner full name" value={formData.ownerName} onChange={(e) => handleFieldChange("ownerName", e.target.value)} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Address *
                </label>
                <Input type="email" value={email} readOnly className="bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number *
                </label>
                <Input type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={(e) => handleFieldChange("phone", e.target.value)} />
              </div>
            </div>

            {/* Password */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Password *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={(e) => handleFieldChange("password", e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.password && formData.password.length < 8 && (
                  <p className="text-xs text-red-500 mt-1">At least 8 characters required</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Confirm Password *
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleFieldChange("confirmPassword", e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 8 && (
                  <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Store Photo
              </label>
              <label
                htmlFor="store-photo-upload"
                className={`flex flex-col items-center border-2 border-dashed rounded-lg p-4 text-center hover:bg-accent transition-colors cursor-pointer ${storePhoto ? "border-green-400 bg-green-50" : ""}`}
              >
                <input
                  id="store-photo-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setStorePhoto(e.target.files?.[0] ?? null)}
                />
                {storePhoto ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-700">{storePhoto.name}</p>
                    <p className="text-xs text-green-600 mt-1">{(storePhoto.size / 1024).toFixed(1)} KB &mdash; click to change</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium mb-1">Upload store photo</p>
                    <p className="text-xs text-muted-foreground">JPG or PNG (max. 2MB)</p>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Store & Address */}
      {currentStep === 2 && (
        <div className="bg-white max-h-[60vh] overflow-y-scroll rounded-md p-6 border shadow-sm">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Store Details & Address
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4">Store Address</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">
                      Address Line 1 *
                    </label>
                    <Input placeholder="Shop number, building name, street" value={formData.addressLine1} onChange={(e) => handleFieldChange("addressLine1", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">
                      Address Line 2
                    </label>
                    <Input placeholder="Area, landmark (optional)" value={formData.addressLine2} onChange={(e) => handleFieldChange("addressLine2", e.target.value)} />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      City *
                    </label>
                    <Input placeholder="Mumbai" value={formData.city} onChange={(e) => handleFieldChange("city", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      State *
                    </label>
                    <Input placeholder="Maharashtra" value={formData.state} onChange={(e) => handleFieldChange("state", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Pincode *
                    </label>
                    <Input placeholder="400001" value={formData.pincode} onChange={(e) => handleFieldChange("pincode", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Location Coordinates</h4>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Accurate coordinates help patients find your store and enable
                  distance-based services
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Latitude *
                  </label>
                  <Input
                    placeholder="19.0760"
                    value={formData.latitude}
                    onChange={(e) => handleFieldChange("latitude", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Longitude *
                  </label>
                  <Input
                    placeholder="72.8777"
                    value={formData.longitude}
                    onChange={(e) => handleFieldChange("longitude", e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="mb-0.5"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {isLocating ? "Locating..." : "Get My Location"}
                </Button>
              </div>
              {formData.latitude && formData.longitude && (
                <p className="text-xs text-green-600 mt-1">✓ Location set: {formData.latitude}, {formData.longitude}</p>
              )}
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Operating Hours
              </h4>
              <div className="space-y-3">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <div
                    key={day}
                    className="flex items-center gap-4 p-3 border rounded-lg"
                  >
                    <div className="w-28">
                      <p className="font-medium text-sm">{day}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        defaultValue="09:00"
                        className="flex-1"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        defaultValue="21:00"
                        className="flex-1"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4" />
                      <span className="text-sm text-muted-foreground">
                        Closed
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Documents */}
      {currentStep === 3 && (
        <div className="bg-white max-h-[60vh] overflow-y-scroll rounded-md p-6 border shadow-sm">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            License & Documents
          </h3>
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                All documents will be verified by our team. Your store will be
                approved once verification is complete.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-4">Drug License *</h4>
              <div>
                <label className="block text-sm font-medium mb-2">
                  License Number *
                </label>
                <Input placeholder="LIC-MH-2024-XXXXX" value={formData.licenseNumber} onChange={(e) => handleFieldChange("licenseNumber", e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  Your pharmacy drug license number
                </p>
              </div>
              <div className="mt-4">
                <p className="block text-sm font-medium mb-2">
                  Upload License Document *
                </p>
                <label
                  htmlFor="license-upload"
                  className={`flex flex-col items-center border-2 border-dashed rounded-lg p-6 text-center hover:bg-accent transition-colors cursor-pointer ${licenseFile ? "border-green-400 bg-green-50" : ""}`}
                >
                  <input
                    id="license-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setLicenseFile(e.target.files?.[0] ?? null)}
                  />
                  {licenseFile ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-700">{licenseFile.name}</p>
                      <p className="text-xs text-green-600 mt-1">{(licenseFile.size / 1024).toFixed(1)} KB &mdash; click to change</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium mb-1">Click to upload license document</p>
                      <p className="text-xs text-muted-foreground">PDF, JPG or PNG (max. 5MB)</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">GST Certificate (Optional)</h4>
              <div>
                <label className="block text-sm font-medium mb-2">
                  GST Number
                </label>
                <Input placeholder="27AABCU9603R1ZM" value={formData.gstNumber} onChange={(e) => handleFieldChange("gstNumber", e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  15-digit GST identification number
                </p>
              </div>
              <div className="mt-4">
                <p className="block text-sm font-medium mb-2">
                  Upload GST Document
                </p>
                <label
                  htmlFor="gst-upload"
                  className={`flex flex-col items-center border-2 border-dashed rounded-lg p-6 text-center hover:bg-accent transition-colors cursor-pointer ${gstFile ? "border-green-400 bg-green-50" : ""}`}
                >
                  <input
                    id="gst-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setGstFile(e.target.files?.[0] ?? null)}
                  />
                  {gstFile ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-700">{gstFile.name}</p>
                      <p className="text-xs text-green-600 mt-1">{(gstFile.size / 1024).toFixed(1)} KB &mdash; click to change</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium mb-1">Click to upload GST document (optional)</p>
                      <p className="text-xs text-muted-foreground">PDF, JPG or PNG (max. 5MB)</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Additional Documents</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Store Photo
                  </label>
                  <label
                    htmlFor="store-photo-upload-3"
                    className={`flex flex-col items-center border-2 border-dashed rounded-lg p-4 text-center hover:bg-accent transition-colors cursor-pointer ${storePhoto ? "border-green-400 bg-green-50" : ""}`}
                  >
                    <input
                      id="store-photo-upload-3"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setStorePhoto(e.target.files?.[0] ?? null)}
                    />
                    {storePhoto ? (
                      <>
                        <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-green-700">{storePhoto.name}</p>
                        <p className="text-xs text-green-600 mt-1">{(storePhoto.size / 1024).toFixed(1)} KB &mdash; click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm font-medium mb-1">Upload store exterior/interior photo</p>
                        <p className="text-xs text-muted-foreground">JPG or PNG (max. 3MB)</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Services */}
      {currentStep === 4 && (
        <div className="bg-white max-h-[60vh] overflow-y-scroll rounded-md p-6 border shadow-sm">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Services & Delivery Settings
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4">Delivery Settings</h4>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <div>
                    <p className="font-medium">Enable Home Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      Deliver medicines to customers' doorstep
                    </p>
                  </div>
                </label>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Delivery Radius (km) *
                    </label>
                    <Input type="number" placeholder="5" defaultValue="5" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum distance for delivery
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Delivery Charge (\u20b9)
                    </label>
                    <Input type="number" placeholder="0" defaultValue="0" />
                    <p className="text-xs text-muted-foreground mt-1">
                      0 for free delivery
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Minimum Order Amount (\u20b9)
                  </label>
                  <Input type="number" placeholder="0" defaultValue="0" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum amount required for order (0 for no minimum)
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Emergency Services</h4>
              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-accent">
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-1"
                  defaultChecked
                />
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    Accept Emergency Alerts
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive urgent medicine requests from nearby patients. You
                    can respond to critical emergencies and save lives.
                  </p>
                </div>
              </label>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Additional Features</h4>
              <div className="space-y-3">
                {[
                  {
                    label: "24/7 Open",
                    desc: "Your store operates round the clock",
                  },
                  {
                    label: "Prescription Scan",
                    desc: "Accept digital prescription uploads",
                  },
                  {
                    label: "Online Payment",
                    desc: "Accept digital payments (UPI, Cards)",
                  },
                  {
                    label: "Cash on Delivery",
                    desc: "Accept cash payments on delivery",
                  },
                ].map((feature) => (
                  <label
                    key={feature.label}
                    className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                  >
                    <input type="checkbox" className="w-4 h-4 mt-1" />
                    <div>
                      <p className="font-medium text-sm">{feature.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {feature.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <div className="bg-white max-h-[60vh] overflow-y-scroll rounded-md p-6 border shadow-sm">
          <h3 className="font-semibold text-lg mb-6">Review & Submit</h3>
          <div className="space-y-6">
            <div className="bg-accent p-4 rounded-lg">
              <h4 className="font-medium mb-3">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Store Name:</span>{" "}<span className="font-medium">{formData.storeName || "—"}</span></p>
                <p><span className="text-muted-foreground">Owner:</span>{" "}<span className="font-medium">{formData.ownerName || "—"}</span></p>
                <p><span className="text-muted-foreground">Email:</span>{" "}<span className="font-medium">{email || "—"}</span></p>
                <p><span className="text-muted-foreground">Phone:</span>{" "}<span className="font-medium">{formData.phone || "—"}</span></p>
                <p>
                  <span className="text-muted-foreground">Password:</span>{" "}
                  {formData.password && formData.password.length >= 8 && formData.password === formData.confirmPassword
                    ? <span className="font-medium text-green-700">Set ✓</span>
                    : <span className="font-medium text-red-500">Not set — go back to Step 1!</span>}
                </p>
              </div>
            </div>

            <div className="bg-accent p-4 rounded-lg">
              <h4 className="font-medium mb-3">Store & Address</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Address:</span>{" "}
                  <span className="font-medium">
                    {[formData.addressLine1, formData.addressLine2, formData.city, formData.state, formData.pincode].filter(Boolean).join(", ") || "—"}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Coordinates:</span>{" "}
                  {formData.latitude && formData.longitude
                    ? <span className="font-medium text-green-700">{formData.latitude}, {formData.longitude}</span>
                    : <span className="text-red-500 font-medium">Not set — go back to Step 2!</span>}
                </p>
              </div>
            </div>

            <div className="bg-accent p-4 rounded-lg">
              <h4 className="font-medium mb-3">License & Documents</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Drug License: {formData.licenseNumber || "—"}</span>
                </div>
                {formData.gstNumber && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>GST Number: {formData.gstNumber}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-accent p-4 rounded-lg">
              <h4 className="font-medium mb-3">Services</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Delivery:</span>{" "}
                  <span className="font-medium">
                    Enabled (5 km radius, \u20b950 charge)
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Emergency Alerts:
                  </span>{" "}
                  <span className="font-medium">Enabled</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Features:</span>{" "}
                  <span className="font-medium">
                    Online Payment, Cash on Delivery
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Note:</strong> Your application will be reviewed by
                  our team within 24-48 hours. You will receive an email
                  notification once your store is verified and approved.
                </span>
              </p>
            </div>

            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer">
              <input type="checkbox" className="mt-1" />
              <span className="text-sm">
                I confirm that all the information provided is accurate and I
                agree to QuickMedi's{" "}
                <span className="text-primary font-medium">
                  Terms & Conditions
                </span>{" "}
                and{" "}
                <span className="text-primary font-medium">Privacy Policy</span>
                .
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {errorMessage && (
        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{errorMessage}</div>
      )}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        {currentStep < 5 ? (
          <Button onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}>
            Next Step
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? "Submitting..." : "Submit Application"}
          </Button>
        )}
      </div>
    </div>
  );
}
