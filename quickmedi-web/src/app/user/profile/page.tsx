"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Shield,
  Bell,
  Heart,
  AlertTriangle,
  UserPlus,
  Plus,
  Save,
  X,
  LogOut,
  Lock,
  Trash2,
} from "lucide-react";
import { patientService } from "@/services/patient.service";
import { useAuthContext } from "@/context/AuthContext";
import type { EmergencyContact, Address } from "@/types/api-types";

export default function ProfilePage() {
  const { logout } = useAuthContext();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Emergency contacts state
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", relation: "" });
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  // Security/password state
  const [memberSince, setMemberSince] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({ label: "", addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressCoords, setAddressCoords] = useState<{ lat: number | null; lng: number | null; locating: boolean }>({ lat: null, lng: null, locating: false });

  // Medical tag-input state
  const [newAllergyInput, setNewAllergyInput] = useState("");
  const [newConditionInput, setNewConditionInput] = useState("");
  const [newMedicationInput, setNewMedicationInput] = useState("");

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "male" as "male" | "female" | "other",
    language: "en",
  });

  const [medicalData, setMedicalData] = useState({
    bloodGroup: "",
    allergies: [] as string[],
    chronicConditions: [] as string[],
    currentMedications: [] as string[],
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await patientService.getProfile();
        if (res.success && res.data) {
          // Backend wraps user in { user: {...} }
          const u = (res.data as any)?.user ?? res.data;
          setProfileData({
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split("T")[0] : "",
            gender: (u.gender as "male" | "female" | "other") || "male",
            language: u.language || "en",
          });
          setMedicalData({
            bloodGroup: u.medicalInfo?.bloodGroup || "",
            allergies: u.medicalInfo?.allergies || [],
            chronicConditions: u.medicalInfo?.chronicConditions || [],
            currentMedications: u.medicalInfo?.currentMedications || [],
          });
          setEmergencyContacts(u.emergencyContacts || []);
          if (u.createdAt) {
            setMemberSince(new Date(u.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }));
          }
        }
      } catch {
        // Failed to fetch profile
      }
    }
    fetchProfile();
  }, []);

  const handleSavePersonal = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await patientService.updateProfile({
        name: profileData.name,
        phone: profileData.phone,
        dateOfBirth: profileData.dateOfBirth,
        gender: profileData.gender,
      });
      if (res.success) {
        setIsEditingPersonal(false);
      } else {
        setSaveError(res.message || "Failed to save. Please try again.");
      }
    } catch {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMedical = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await patientService.updateMedicalInfo({
        bloodGroup: medicalData.bloodGroup,
        allergies: medicalData.allergies,
        chronicConditions: medicalData.chronicConditions,
        currentMedications: medicalData.currentMedications,
      });
      if (res.success) {
        setIsEditingMedical(false);
      } else {
        setSaveError(res.message || "Failed to save. Please try again.");
      }
    } catch {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveContactsToAPI = async (contacts: EmergencyContact[]) => {
    setIsSavingContacts(true);
    setContactsError(null);
    try {
      const res = await patientService.updateEmergencyContacts(contacts);
      if (res.success) {
        setEmergencyContacts(contacts);
        setShowContactForm(false);
        setEditingContactIndex(null);
        setContactForm({ name: "", phone: "", relation: "" });
      } else {
        setContactsError(res.message || "Failed to save contacts.");
      }
    } catch {
      setContactsError("Something went wrong. Please try again.");
    } finally {
      setIsSavingContacts(false);
    }
  };

  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...emergencyContacts];
    const entry: EmergencyContact = { name: contactForm.name, phone: contactForm.phone, relation: contactForm.relation };
    if (editingContactIndex !== null) {
      updated[editingContactIndex] = entry;
    } else {
      updated.push(entry);
    }
    await saveContactsToAPI(updated);
  };

  const handleDeleteContact = async (index: number) => {
    const updated = emergencyContacts.filter((_, i) => i !== index);
    await saveContactsToAPI(updated);
  };

  const openEditContact = (index: number) => {
    const c = emergencyContacts[index];
    setContactForm({ name: c.name, phone: c.phone, relation: c.relation });
    setEditingContactIndex(index);
    setShowContactForm(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await patientService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      if (res.success) {
        setPasswordSuccess(true);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordError(res.message || "Failed to change password.");
      }
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── Medical tag helpers ──────────────────────────────────────────
  const addTag = (field: "allergies" | "chronicConditions" | "currentMedications", value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setMedicalData((prev) => ({ ...prev, [field]: [...prev[field], trimmed] }));
  };

  const removeTag = (field: "allergies" | "chronicConditions" | "currentMedications", index: number) => {
    setMedicalData((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  // ── Address handlers ─────────────────────────────────────────────
  useEffect(() => {
    async function fetchAddresses() {
      try {
        const res = await patientService.getAddresses();
        if (res.success && res.data) {
          setAddresses((res.data as any)?.addresses ?? (Array.isArray(res.data) ? res.data : []));
        }
      } catch {
        // ignore
      }
    }
    fetchAddresses();
  }, []);

  const getAddressLocation = () => {
    setAddressCoords((p) => ({ ...p, locating: true }));
    if (!navigator.geolocation) {
      setAddressCoords((p) => ({ ...p, locating: false }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setAddressCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, locating: false }),
      () => setAddressCoords((p) => ({ ...p, locating: false }))
    );
  };

  const openAddressForm = (address?: Address) => {
    if (address) {
      setEditingAddressId(address._id ?? null);
      setAddressForm({
        label: address.label,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 ?? "",
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      });
      // Populate coords from stored GeoJSON if available
      const [lng, lat] = address.location?.coordinates ?? [null, null];
      setAddressCoords({ lat: lat ?? null, lng: lng ?? null, locating: false });
    } else {
      setEditingAddressId(null);
      setAddressForm({ label: "home", addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" });
      setAddressCoords({ lat: null, lng: null, locating: false });
    }
    setAddressError(null);
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    setAddressError(null);
    try {
      if (addressCoords.lat === null || addressCoords.lng === null) {
        setAddressError("Please use the \"Get my location\" button to set your coordinates.");
        setIsSavingAddress(false);
        return;
      }
      const payload = {
        label: addressForm.label as "home" | "work" | "other",
        addressLine1: addressForm.addressLine1,
        addressLine2: addressForm.addressLine2 || undefined,
        city: addressForm.city,
        state: addressForm.state,
        pincode: addressForm.pincode,
        isDefault: addresses.length === 0,
        latitude: addressCoords.lat,
        longitude: addressCoords.lng,
      };
      let res;
      if (editingAddressId) {
        res = await patientService.updateAddress(editingAddressId, payload);
      } else {
        res = await patientService.addAddress(payload);
      }
      if (res.success) {
        // Refresh full list
        const listRes = await patientService.getAddresses();
        if (listRes.success && listRes.data) {
          setAddresses((listRes.data as any)?.addresses ?? (Array.isArray(listRes.data) ? listRes.data : []));
        }
        setShowAddressForm(false);
        setEditingAddressId(null);
        setAddressForm({ label: "home", addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" });
        setAddressCoords({ lat: null, lng: null, locating: false });
      } else {
        setAddressError(res.message || "Failed to save address.");
      }
    } catch {
      setAddressError("Something went wrong. Please try again.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const res = await patientService.deleteAddress(id);
      if (res.success) {
        setAddresses((prev) => prev.filter((a) => a._id !== id));
      }
    } catch {
      // ignore
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const res = await patientService.setDefaultAddress(id);
      if (res.success) {
        setAddresses((prev) =>
          prev.map((a) => ({ ...a, isDefault: a._id === id }))
        );
      }
    } catch {
      // ignore
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "medical", label: "Medical Info", icon: Heart },
    { id: "addresses", label: "Addresses", icon: MapPin },
    { id: "contacts", label: "Emergency Contacts", icon: UserPlus },
    { id: "subscription", label: "Subscription", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-600 mt-1">
          Manage your account settings and preferences
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <Card className="shadow-md rounded-md">
              <CardContent className="p-3">
                {/* Profile Summary */}
                <div className="flex flex-col items-center text-center pb-4 mb-4 border-b">
                  <div className="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center text-xl font-bold text-white mb-2">
                    {profileData.name ? profileData.name.slice(0, 2).toUpperCase() : "U"}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {profileData.name || "Loading..."}
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {profileData.email}
                  </p>
                  <Badge className="mt-2 bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0.5">
                    Active
                  </Badge>
                </div>

                {/* Navigation Tabs */}
                <nav className="space-y-0.5">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium rounded-md transition-colors ${
                          activeTab === tab.id
                            ? "bg-teal-50 text-teal-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>

                {/* Logout Button */}
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logout()}
                    className="w-full justify-start text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <Card className="shadow-md rounded-md">
                <CardHeader className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Personal Information
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Update your personal details and contact information
                      </CardDescription>
                    </div>
                    {!isEditingPersonal ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingPersonal(true)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSavePersonal}
                          disabled={isSaving}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingPersonal(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Profile Completeness */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">
                        Profile Completeness
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        85%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: "85%" }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Complete your medical information to unlock personalized
                      recommendations
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">
                          Full Name
                        </label>
                        <Input
                          defaultValue={profileData.name}
                          value={profileData.name}
                          onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))}
                          disabled={!isEditingPersonal}
                          className={`h-9 text-sm ${!isEditingPersonal ? "bg-gray-50" : ""}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          value={profileData.email}
                          disabled
                          className="h-9 text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700">
                          Phone Number
                        </label>
                        <Input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))}
                          disabled={!isEditingPersonal}
                          className={`h-9 text-sm ${!isEditingPersonal ? "bg-gray-50" : ""}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700">
                          Date of Birth
                        </label>
                        <Input
                          type="date"
                          value={profileData.dateOfBirth}
                          onChange={(e) => setProfileData(p => ({ ...p, dateOfBirth: e.target.value }))}
                          disabled={!isEditingPersonal}
                          className={`h-9 text-sm ${!isEditingPersonal ? "bg-gray-50" : ""}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700">
                          Gender
                        </label>
                        <select
                          disabled={!isEditingPersonal}
                          value={profileData.gender}
                          onChange={(e) => setProfileData(p => ({ ...p, gender: e.target.value as "male" | "female" | "other" }))}
                          className={`w-full h-9 text-sm rounded-md border border-gray-300 px-3 ${!isEditingPersonal ? "bg-gray-50" : "bg-white"}`}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700">
                          Language Preference
                        </label>
                        <select
                          disabled={!isEditingPersonal}
                          defaultValue="en"
                          className={`w-full h-9 text-sm rounded-md border border-gray-300 px-3 ${!isEditingPersonal ? "bg-gray-50" : "bg-white"}`}
                        >
                          <option value="en">English</option>
                          <option value="hi">हिंदी (Hindi)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medical Info Tab */}
            {activeTab === "medical" && (
              <Card className="shadow-md rounded-md">
                <CardHeader className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Heart className="w-4 h-4 text-red-500" />
                        Medical Information
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Manage your health information and medical history
                      </CardDescription>
                    </div>
                    {!isEditingMedical ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingMedical(true)}
                        className="h-8 text-xs"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveMedical}
                          disabled={isSaving}
                          className="h-8 text-xs"
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setIsEditingMedical(false); setSaveError(null); }}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {saveError && <p className="text-xs text-red-600 mb-3">{saveError}</p>}
                  <div className="space-y-4">
                    {/* Blood Group */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-700">
                          Blood Group
                        </label>
                        {isEditingMedical ? (
                          <select
                            value={medicalData.bloodGroup}
                            onChange={(e) => setMedicalData((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                            className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="">Select blood group</option>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                              <option key={bg} value={bg}>{bg}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="h-9 flex items-center px-3 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700">
                            {medicalData.bloodGroup || <span className="text-gray-400">Not specified</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Allergies */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-700">
                        Allergies
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
                        {medicalData.allergies.map((item, i) => (
                          <Badge key={i} className="bg-red-50 text-red-700 border-red-200 text-xs px-2 py-0.5 flex items-center gap-1">
                            {item}
                            {isEditingMedical && (
                              <button type="button" onClick={() => removeTag("allergies", i)} className="ml-0.5 hover:text-red-900">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                        {medicalData.allergies.length === 0 && !isEditingMedical && (
                          <span className="text-xs text-gray-400">None recorded</span>
                        )}
                      </div>
                      {isEditingMedical && (
                        <div className="flex gap-2">
                          <Input
                            value={newAllergyInput}
                            onChange={(e) => setNewAllergyInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag("allergies", newAllergyInput); setNewAllergyInput(""); } }}
                            placeholder="Type allergy and press Enter"
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => { addTag("allergies", newAllergyInput); setNewAllergyInput(""); }}
                            className="h-8 text-xs"
                          >
                            Add
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Chronic Conditions */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-700">
                        Chronic Conditions
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
                        {medicalData.chronicConditions.map((item, i) => (
                          <Badge key={i} className="bg-orange-50 text-orange-700 border-orange-200 text-xs px-2 py-0.5 flex items-center gap-1">
                            {item}
                            {isEditingMedical && (
                              <button type="button" onClick={() => removeTag("chronicConditions", i)} className="ml-0.5 hover:text-orange-900">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                        {medicalData.chronicConditions.length === 0 && !isEditingMedical && (
                          <span className="text-xs text-gray-400">None recorded</span>
                        )}
                      </div>
                      {isEditingMedical && (
                        <div className="flex gap-2">
                          <Input
                            value={newConditionInput}
                            onChange={(e) => setNewConditionInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag("chronicConditions", newConditionInput); setNewConditionInput(""); } }}
                            placeholder="Type condition and press Enter"
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => { addTag("chronicConditions", newConditionInput); setNewConditionInput(""); }}
                            className="h-8 text-xs"
                          >
                            Add
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Current Medications */}
                    <div>
                      <label className="block text-xs font-medium mb-1.5 text-gray-700">
                        Current Medications
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
                        {medicalData.currentMedications.map((item, i) => (
                          <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5 flex items-center gap-1">
                            {item}
                            {isEditingMedical && (
                              <button type="button" onClick={() => removeTag("currentMedications", i)} className="ml-0.5 hover:text-blue-900">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                        {medicalData.currentMedications.length === 0 && !isEditingMedical && (
                          <span className="text-xs text-gray-400">None recorded</span>
                        )}
                      </div>
                      {isEditingMedical && (
                        <div className="flex gap-2">
                          <Input
                            value={newMedicationInput}
                            onChange={(e) => setNewMedicationInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag("currentMedications", newMedicationInput); setNewMedicationInput(""); } }}
                            placeholder="Type medication and press Enter"
                            className="h-8 text-xs flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => { addTag("currentMedications", newMedicationInput); setNewMedicationInput(""); }}
                            className="h-8 text-xs"
                          >
                            Add
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Addresses Tab */}
            {activeTab === "addresses" && (
              <Card className="shadow-md rounded-md">
                <CardHeader className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        Saved Addresses
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Manage your delivery addresses
                      </CardDescription>
                    </div>
                    {!showAddressForm && (
                      <Button size="sm" className="h-8 text-xs" onClick={() => openAddressForm()}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add Address
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Add / Edit form */}
                  {showAddressForm && (
                    <form onSubmit={handleSaveAddress} className="mb-5 p-4 border border-teal-200 rounded-md bg-teal-50/30 space-y-3">
                      <h4 className="text-xs font-semibold text-gray-800">
                        {editingAddressId ? "Edit Address" : "New Address"}
                      </h4>
                      {addressError && <p className="text-xs text-red-600">{addressError}</p>}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700">Label</label>
                          <select
                            value={addressForm.label}
                            onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))}
                            required
                            className="w-full h-8 px-3 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="home">🏠 Home</option>
                            <option value="work">💼 Work</option>
                            <option value="other">📍 Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700">Pincode</label>
                          <Input
                            value={addressForm.pincode}
                            onChange={(e) => setAddressForm((p) => ({ ...p, pincode: e.target.value }))}
                            placeholder="400001"
                            required
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700">Address Line 1</label>
                        <Input
                          value={addressForm.addressLine1}
                          onChange={(e) => setAddressForm((p) => ({ ...p, addressLine1: e.target.value }))}
                          placeholder="House / Flat / Block No., Street"
                          required
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700">Address Line 2 (optional)</label>
                        <Input
                          value={addressForm.addressLine2}
                          onChange={(e) => setAddressForm((p) => ({ ...p, addressLine2: e.target.value }))}
                          placeholder="Landmark, Area"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700">City</label>
                          <Input
                            value={addressForm.city}
                            onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))}
                            placeholder="Mumbai"
                            required
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700">State</label>
                          <Input
                            value={addressForm.state}
                            onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value }))}
                            placeholder="Maharashtra"
                            required
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      {/* Location picker */}
                      <div>
                        <label className="block text-xs font-medium mb-1 text-gray-700">Location Coordinates</label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={getAddressLocation}
                            disabled={addressCoords.locating}
                            className="h-8 text-xs"
                          >
                            <MapPin className="w-3.5 h-3.5 mr-1.5" />
                            {addressCoords.locating ? "Locating..." : "Get my location"}
                          </Button>
                          {addressCoords.lat !== null && (
                            <span className="text-xs text-green-600 font-medium">
                              ✓ {addressCoords.lat.toFixed(4)}, {addressCoords.lng!.toFixed(4)}
                            </span>
                          )}
                          {addressCoords.lat === null && (
                            <span className="text-xs text-gray-400">Not set — required to save</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button type="submit" size="sm" disabled={isSavingAddress || addressCoords.locating} className="h-8 text-xs">
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          {isSavingAddress ? "Saving..." : editingAddressId ? "Update" : "Save Address"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => { setShowAddressForm(false); setEditingAddressId(null); setAddressError(null); setAddressCoords({ lat: null, lng: null, locating: false }); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Address list */}
                  {addresses.length === 0 && !showAddressForm ? (
                    <div className="text-center py-8 text-gray-400">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">No saved addresses yet.</p>
                      <Button size="sm" variant="outline" className="mt-3 h-8 text-xs" onClick={() => openAddressForm()}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Add your first address
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((address) => (
                        <div key={address._id} className="p-3 border rounded-md hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <h4 className="text-sm font-semibold text-gray-900">{address.label}</h4>
                                {address.isDefault && (
                                  <Badge className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0.5">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-700 mb-0.5">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}</p>
                              <p className="text-xs text-gray-600">{address.city}, {address.state} - {address.pincode}</p>
                              {!address.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => address._id && handleSetDefaultAddress(address._id)}
                                  className="mt-1.5 text-xs text-teal-600 hover:text-teal-800 underline"
                                >
                                  Set as default
                                </button>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openAddressForm(address)}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                onClick={() => address._id && handleDeleteAddress(address._id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Emergency Contacts Tab */}
            {activeTab === "contacts" && (
              <Card className="shadow-md rounded-md">
                <CardHeader className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <UserPlus className="w-4 h-4 text-orange-500" />
                        Emergency Contacts
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        People to contact in case of emergency (max 5)
                      </CardDescription>
                    </div>
                    {!showContactForm && emergencyContacts.length < 5 && (
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setContactForm({ name: "", phone: "", relation: "" });
                          setEditingContactIndex(null);
                          setShowContactForm(true);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-2" />
                        Add Contact
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Add/Edit Form */}
                  {showContactForm && (
                    <form onSubmit={handleContactFormSubmit} className="border rounded-md p-4 bg-orange-50 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {editingContactIndex !== null ? "Edit Contact" : "New Contact"}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700">Full Name *</label>
                          <Input
                            required
                            value={contactForm.name}
                            onChange={(e) => setContactForm(f => ({ ...f, name: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder="Jane Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700">Phone *</label>
                          <Input
                            required
                            value={contactForm.phone}
                            onChange={(e) => setContactForm(f => ({ ...f, phone: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder="+919876543210"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-700">Relation *</label>
                          <Input
                            required
                            value={contactForm.relation}
                            onChange={(e) => setContactForm(f => ({ ...f, relation: e.target.value }))}
                            className="h-8 text-sm"
                            placeholder="Spouse, Parent, etc."
                          />
                        </div>
                      </div>
                      {contactsError && <p className="text-xs text-red-600">{contactsError}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="h-8 text-xs" disabled={isSavingContacts}>
                          <Save className="w-3.5 h-3.5 mr-2" />
                          {isSavingContacts ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => { setShowContactForm(false); setEditingContactIndex(null); setContactsError(null); }}
                        >
                          <X className="w-3.5 h-3.5 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Contact List */}
                  {emergencyContacts.length === 0 && !showContactForm ? (
                    <div className="text-center py-8 text-gray-500">
                      <UserPlus className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No emergency contacts added yet.</p>
                      <Button
                        size="sm"
                        className="mt-3 h-8 text-xs"
                        onClick={() => { setContactForm({ name: "", phone: "", relation: "" }); setEditingContactIndex(null); setShowContactForm(true); }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-2" /> Add First Contact
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {emergencyContacts.map((contact, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-md hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">{contact.name}</h4>
                              <p className="text-xs text-gray-600">{contact.phone}</p>
                              <p className="text-xs text-gray-500">{contact.relation}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openEditContact(index)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteContact(index)}
                              disabled={isSavingContacts}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Subscription Tab */}
            {activeTab === "subscription" && (
              <Card className="shadow-md rounded-md">
                <CardHeader className="border-b p-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="w-4 h-4 text-purple-500" />
                      Subscription Plan
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Manage your subscription and billing
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Current Plan */}
                    <div className="p-4 border-2 border-green-200 bg-green-50 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          Free Plan
                        </h3>
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-700 border-green-300 text-xs"
                        >
                          Active
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        Basic access to QuickMeds features
                      </p>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <div className="w-1 h-1 rounded-full bg-green-600"></div>
                          Medicine search and information
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <div className="w-1 h-1 rounded-full bg-green-600"></div>
                          Basic medication reminders
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <div className="w-1 h-1 rounded-full bg-green-600"></div>
                          Drug interaction checker
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>Member since: December 15, 2023</p>
                      </div>
                    </div>

                    {/* Pro Plan */}
                    <div className="p-4 border-2 border-purple-200 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          Pro Plan
                        </h3>
                        <span className="text-sm font-bold text-purple-600">
                          ₹199/month
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        Unlock all premium features
                      </p>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <div className="w-1 h-1 rounded-full bg-purple-600"></div>
                          Everything in Free plan
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <div className="w-1 h-1 rounded-full bg-purple-600"></div>
                          Advanced medication reminders with family sharing
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <div className="w-1 h-1 rounded-full bg-purple-600"></div>
                          Prescription OCR with unlimited scans
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <div className="w-1 h-1 rounded-full bg-purple-600"></div>
                          Priority customer support
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <div className="w-1 h-1 rounded-full bg-purple-600"></div>
                          Health insights and analytics
                        </div>
                      </div>
                      <Button className="w-full h-9 text-sm bg-purple-600 hover:bg-purple-700">
                        Upgrade to Pro
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <Card className="shadow-md rounded-md">
                <CardHeader className="border-b p-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="w-4 h-4 text-green-500" />
                      Security Settings
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Manage your password and security preferences
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Change Password */}
                    <div className="pb-4 border-b">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        Change Password
                      </h3>
                      <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                        <div>
                          <label className="block text-xs font-medium mb-1.5 text-gray-700">
                            Current Password <span className="text-gray-400">(leave blank if not set)</span>
                          </label>
                          <Input
                            type="password"
                            className="h-9 text-sm"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5 text-gray-700">
                            New Password
                          </label>
                          <Input
                            type="password"
                            required
                            className="h-9 text-sm"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                            placeholder="Min 8 characters"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5 text-gray-700">
                            Confirm New Password
                          </label>
                          <Input
                            type="password"
                            required
                            className="h-9 text-sm"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                            placeholder="Repeat new password"
                          />
                        </div>
                        {passwordError && (
                          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md">{passwordError}</p>
                        )}
                        {passwordSuccess && (
                          <p className="text-xs text-green-700 bg-green-50 p-2 rounded-md">Password updated successfully!</p>
                        )}
                        <Button type="submit" className="h-8 text-xs" disabled={isChangingPassword}>
                          <Lock className="w-3.5 h-3.5 mr-2" />
                          {isChangingPassword ? "Updating..." : "Update Password"}
                        </Button>
                      </form>
                    </div>

                    {/* Verification Status */}
                    <div className="pb-4 border-b">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        Verification Status
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs text-gray-700">Email</span>
                            <span className="text-xs text-gray-500">{profileData.email}</span>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                            Verified
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${profileData.phone ? "bg-green-500" : "bg-gray-300"}`}></div>
                            <span className="text-xs text-gray-700">Phone</span>
                            {profileData.phone && <span className="text-xs text-gray-500">{profileData.phone}</span>}
                          </div>
                          <Badge
                            variant="outline"
                            className={profileData.phone
                              ? "bg-green-50 text-green-700 border-green-300 text-xs"
                              : "bg-gray-50 text-gray-500 border-gray-300 text-xs"}
                          >
                            {profileData.phone ? "Verified" : "Not added"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Account Info */}
                    {memberSince && (
                      <div className="pb-4 border-b">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">
                          Account Info
                        </h3>
                        <p className="text-xs text-gray-600">Member since: {memberSince}</p>
                      </div>
                    )}

                    {/* Account Actions */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        Account Actions
                      </h3>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={async () => { await logout(); }}
                        >
                          <LogOut className="w-3.5 h-3.5 mr-2" />
                          Sign Out
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

