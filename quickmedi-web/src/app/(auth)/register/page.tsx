"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Store, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import VendorRegistration from "@/components/auth/VendorRegistration";
import { authService } from "@/services/auth.service";
import { STORAGE_KEYS } from "@/lib/api-config";
import { useAuthContext } from "@/context/AuthContext";

type UserType = "user" | "medical" | null;

export default function RegisterPage() {
	const router = useRouter();
	const { refreshUser } = useAuthContext();
	const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState(["", "", "", "", "", ""]);
	const [userType, setUserType] = useState<UserType>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [alreadyRegistered, setAlreadyRegistered] = useState<{ role: string } | null>(null);
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// User registration form state
	const [userData, setUserData] = useState({
		firstName: "",
		lastName: "",
		phone: "",
		address: "",
		password: "",
		confirmPassword: "",
	});

	const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage(null);
		setLoading(true);
		try {
			const res = await authService.sendOTP(email);
			if (res.success) {
				setStep(2);
			} else {
				setErrorMessage(res.message || "Failed to send OTP. Please try again.");
			}
		} catch {
			setErrorMessage("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleOtpChange = (index: number, value: string) => {
		if (value.length > 1) return;
		const newOtp = [...otp];
		newOtp[index] = value;
		setOtp(newOtp);
		if (value && index < 5) {
			const nextInput = document.getElementById(`otp-${index + 1}`);
			nextInput?.focus();
		}
	};

	const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Backspace" && !otp[index] && index > 0) {
			const prevInput = document.getElementById(`otp-${index - 1}`);
			prevInput?.focus();
		}
	};

	const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage(null);
		const enteredOtp = otp.join("");
		if (enteredOtp.length < 6) {
			setErrorMessage("Please enter the full 6-digit OTP.");
			return;
		}
		setLoading(true);
		try {
			const res = await authService.verifyOTP(email, enteredOtp);
			if (res.success) {
				if (res.data?.isNewUser === false) {
					// Email already registered — clear any silently saved tokens and show login prompt
					localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
					localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
					localStorage.removeItem(STORAGE_KEYS.USER_DATA);
					localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
					setAlreadyRegistered({ role: res.data?.userType || "patient" });
					return;
				}
				// New user — proceed to account type selection
				setStep(3);
			} else {
				setErrorMessage(res.message || "Invalid OTP. Please try again.");
			}
		} catch {
			setErrorMessage("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleUserTypeSelect = (type: UserType) => {
		setUserType(type);
		setStep(4);
	};

	const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setUserData({ ...userData, [e.target.name]: e.target.value });
		setErrorMessage(null);
	};

	const handleUserRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage(null);

		if (userData.password.length < 6) {
			setErrorMessage("Password must be at least 6 characters.");
			return;
		}
		if (userData.password !== userData.confirmPassword) {
			setErrorMessage("Passwords do not match.");
			return;
		}

		setLoading(true);
		try {
			const res = await authService.registerPatient({
				email,
				name: `${userData.firstName} ${userData.lastName}`.trim(),
				phone: userData.phone,
				password: userData.password,
			} as any);
			if (res.success) {
				refreshUser();
				router.push("/user/dashboard");
			} else {
				setErrorMessage(res.message || "Registration failed. Please try again.");
			}
		} catch {
			setErrorMessage("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="min-h-screen py-3"
			style={{
				backgroundImage: 'url("/images/svg/background-frame.svg")',
				backgroundSize: "contain",
				backgroundRepeat: "repeat",
				backgroundPosition: "center",
				backgroundColor: "#faf9f7",
			}}
		>
			<div className="max-w-2xl mx-auto space-y-3">
				{/* Page Header */}
				<div className="text-center">
					{/* <h1 className="text-3xl font-bold text-gray-900">Create Account</h1> */}
					<p className="text-gray-600 mt-2">
						{step === 1 && "Enter your email to get started"}
						{step === 2 && "Verify your email with OTP"}
						{step === 3 && "Choose your account type"}
						{step === 4 && userType === "user" && "Complete your registration"}
						{step === 4 && userType === "medical" && "Complete vendor registration"}
					</p>
				</div>

				{/* Step 1: Email Input */}
				{step === 1 && (
					<div className="bg-white rounded-md p-8 border shadow-sm">
						<form className="space-y-6" onSubmit={handleEmailSubmit}>
							<div className="space-y-2">
								<label htmlFor="email" className="block text-sm font-medium text-gray-700">
									Email Address *
								</label>
								<input
									id="email"
									type="email"
									placeholder="Enter your email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
								/>
								<p className="text-xs text-gray-500">We'll send you a verification code</p>
							</div>
							<button
								type="submit"
								disabled={loading}
								className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition duration-300 shadow-md hover:shadow-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
							>
								{loading ? "Sending OTP..." : "Send OTP"}
							</button>
						</form>
					</div>
				)}

				{/* Step 2: OTP Verification */}
				{step === 2 && (
					<div className="bg-white rounded-md p-8 border shadow-sm">
						<form className="space-y-6" onSubmit={handleOtpSubmit}>
							<div className="space-y-4">
								<div className="text-center">
									<h3 className="font-semibold text-lg mb-2">Verify Your Email</h3>
									<p className="text-sm text-gray-600">
										Enter the 6-digit OTP sent to <strong>{email}</strong>
									</p>
								</div>
								<div className="flex gap-2 justify-center">
									{otp.map((digit, index) => (
										<input
											key={index}
											id={`otp-${index}`}
											type="text"
											maxLength={1}
											value={digit}
											onChange={(e) => handleOtpChange(index, e.target.value)}
											onKeyDown={(e) => handleOtpKeyDown(index, e)}
											inputMode="numeric"
											className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
										/>
									))}
								</div>
							</div>
							{alreadyRegistered ? (
								<div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center space-y-3">
									<p className="text-sm font-medium text-orange-800">
										This email is already registered as a <strong>{alreadyRegistered.role}</strong>.
									</p>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={() => { setAlreadyRegistered(null); setEmail(""); setOtp(["","","","","",""]); setStep(1); }}
											className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-sm font-semibold"
										>
											Use different email
										</button>
										<Link
											href="/login"
											className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 text-sm font-semibold text-center"
										>
											Go to Login
										</Link>
									</div>
								</div>
							) : errorMessage ? (
								<div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">
									{errorMessage}
								</div>
							) : null}
							<div className="flex gap-3">
								<button
									type="button"
									onClick={() => setStep(1)}
									className="w-1/3 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition duration-300 font-semibold"
								>
									Back
								</button>
								<button
									type="submit"
									disabled={loading}
									className="w-2/3 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition duration-300 shadow-md hover:shadow-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
								>
									{loading ? "Verifying..." : "Verify OTP"}
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Step 3: User Type Selection */}
				{step === 3 && (
					<div className="bg-white rounded-md p-8 border shadow-sm">
						<h3 className="font-semibold text-lg mb-6 text-center">Choose Account Type</h3>
						<div className="space-y-4">
							{/* User Card */}
							<button
								onClick={() => handleUserTypeSelect("user")}
								className="w-full p-6 cursor-pointer border-2 border-gray-200 rounded-md hover:border-orange-500 hover:bg-orange-50 transition-all duration-300 text-left group"
							>
								<div className="flex items-center gap-4">
									<div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
										<User className="h-7 w-7 text-blue-600" />
									</div>
									<div className="flex-1">
										<h3 className="font-bold text-lg text-gray-900">Register as User</h3>
										<p className="text-sm text-gray-600">
											For patients looking for medicines and pharmacies
										</p>
									</div>
									<ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-orange-500 transition" />
								</div>
							</button>

							{/* Medical Vendor Card */}
							<button
								onClick={() => handleUserTypeSelect("medical")}
								className="w-full cursor-pointer p-6 border-2 border-gray-200 rounded-md hover:border-orange-500 hover:bg-orange-50 transition-all duration-300 text-left group"
							>
								<div className="flex items-center gap-4">
									<div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
										<Store className="h-7 w-7 text-green-600" />
									</div>
									<div className="flex-1">
										<h3 className="font-bold text-lg text-gray-900">
											Register as Medical Vendor
										</h3>
										<p className="text-sm text-gray-600">
											For pharmacy owners and medical stores
										</p>
									</div>
									<ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-orange-500 transition" />
								</div>
							</button>
						</div>
						<button
							type="button"
							onClick={() => setStep(2)}
							className="w-full mt-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition duration-300 font-semibold"
						>
							Back
						</button>
					</div>
				)}

				{/* Step 4: User Registration Form */}
				{step === 4 && userType === "user" && (
					<div className="bg-white rounded-md p-8 border shadow-sm">
						<h3 className="font-semibold text-lg mb-6">User Information</h3>
						<form className="space-y-4" onSubmit={handleUserRegistration}>
						<div className="grid gap-4 grid-cols-2">
							<div className="space-y-2">
								<label htmlFor="firstName" className="text-sm font-medium text-gray-700">
									First Name
								</label>
								<input
									id="firstName"
									name="firstName"
									type="text"
									placeholder="First name"
									value={userData.firstName}
									onChange={handleUserChange}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
								/>
							</div>
							<div className="space-y-2">
								<label htmlFor="lastName" className="text-sm font-medium text-gray-700">
									Last Name
								</label>
								<input
									id="lastName"
									name="lastName"
									type="text"
									placeholder="Last name"
									value={userData.lastName}
									onChange={handleUserChange}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<label htmlFor="phone" className="text-sm font-medium text-gray-700">
								Phone Number
							</label>
							<input
								id="phone"
								name="phone"
								type="tel"
								placeholder="Enter phone number"
								value={userData.phone}
								onChange={handleUserChange}
								required
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="address" className="text-sm font-medium text-gray-700">
								Address
							</label>
							<input
								id="address"
								name="address"
								type="text"
								placeholder="Enter address"
								value={userData.address}
								onChange={handleUserChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="password" className="text-sm font-medium text-gray-700">
							Password <span className="text-red-500">*</span>
						</label>
						<div className="relative">
							<input
								id="password"
								name="password"
								type={showPassword ? "text" : "password"}
								placeholder="Create a password (min 6 characters)"
								value={userData.password}
								onChange={handleUserChange}
								required
								className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
							/>
							<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					<div className="space-y-2">
						<label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
							Confirm Password <span className="text-red-500">*</span>
						</label>
						<div className="relative">
							<input
								id="confirmPassword"
								name="confirmPassword"
								type={showConfirmPassword ? "text" : "password"}
								placeholder="Confirm your password"
								value={userData.confirmPassword}
								onChange={handleUserChange}
								required
								className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
							/>
							<button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
								{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					{errorMessage && (
						<div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{errorMessage}</div>
					)}

					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={() => setStep(3)}
							className="w-1/3 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition duration-300 font-semibold"
						>
							Back
						</button>
						<button
							type="submit"
							disabled={loading}
							className="w-2/3 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition duration-300 shadow-md hover:shadow-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
						>
							{loading ? "Registering..." : "Complete Registration"}
						</button>
					</div>
					</form>
				</div>
			)}

				{/* Step 4: Vendor Registration Form */}
				{step === 4 && userType === "medical" && (
					<VendorRegistration email={email} />
				)}

				{/* Login Link */}
				<div className="text-center">
					<p className="text-sm text-gray-600">
						Already have an account?{" "}
						<Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700">
							Login
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
