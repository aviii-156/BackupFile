"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HeartPulse, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { authService } from "@/services/auth.service";
import { STORAGE_KEYS } from "@/lib/api-config";
import { useAuthContext } from "@/context/AuthContext";
import Image from "@/assets/login-page.jpg";

type LoginMode = "user" | "admin";

export default function LoginPage() {
	const router = useRouter();
	const { isAuthenticated, isLoading, role, refreshUser } = useAuthContext();
	const [mode, setMode] = useState<LoginMode>("user");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [step, setStep] = useState<1 | 2>(1);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Auth guard: redirect if already logged in
	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			if (role === "admin") router.replace("/admin/dashboard");
			else if (role === "vendor") router.replace("/medico/dashboard");
			else router.replace("/user/dashboard");
		}
	}, [isLoading, isAuthenticated, role, router]);

	const handleEmailNext = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage(null);
		if (!email.trim()) {
			setErrorMessage("Please enter your email address.");
			return;
		}
		setStep(2);
	};

	const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage(null);
		setLoading(true);
		try {
			let res;
			if (mode === "admin") {
				res = await authService.adminLogin(email, password);
			} else {
				res = await authService.loginWithPassword(email, password);
			}

			if (res.success) {
				refreshUser();
				const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
				if (role === "admin") router.push("/admin/dashboard");
				else if (role === "vendor") router.push("/medico/dashboard");
				else router.push("/user/dashboard");
			} else {
				setErrorMessage(res.message || "Login failed. Please check your credentials.");
			}
		} catch (err: any) {
			setErrorMessage(err.message || "Login failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="flex justify-center items-center min-h-screen"
			style={{
				backgroundImage: 'url("/images/svg/background-frame.svg")',
				backgroundSize: "contain",
				backgroundRepeat: "repeat",
				backgroundPosition: "center",
				backgroundColor: "#faf9f7",
			}}
		>
			<div className="flex flex-col md:flex-row items-center w-[90vw] h-full lg:h-[80vh] md:h-[80vh] max-w-4xl rounded-md shadow-xl overflow-hidden bg-white">
				{/* Left side - Image */}
				<div className="md:h-full px-2 py-2 h-auto md:w-1/2 w-full">
					<img
						src={Image.src}
						alt="Pharmacy Illustration"
						className="h-full w-full rounded-l-md object-cover"
					/>
				</div>

				{/* Right side - Form */}
				<div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 space-y-5 bg-white">
					{/* Logo */}
					<div className="text-center">
						<div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
							{mode === "admin" ? <ShieldCheck className="h-7 w-7" /> : <HeartPulse className="h-7 w-7" />}
						</div>
						<h1 className="text-4xl font-extrabold text-gray-900">QuickMedi</h1>
						<p className="text-gray-600 mt-1 text-sm">
							{step === 1 ? "Enter your email to get started" : `Sign in as ${mode === "admin" ? "Admin" : "User / Vendor"}`}
						</p>
					</div>

					{/* Mode toggle */}
					<div className="flex w-full rounded-lg overflow-hidden border border-gray-200">
						<button
							type="button"
							onClick={() => { setMode("user"); setStep(1); setErrorMessage(null); }}
							className={`flex-1 py-2 text-sm font-medium transition ${mode === "user" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
						>
							User / Vendor
						</button>
						<button
							type="button"
							onClick={() => { setMode("admin"); setStep(1); setErrorMessage(null); }}
							className={`flex-1 py-2 text-sm font-medium transition ${mode === "admin" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
						>
							Admin
						</button>
					</div>

					{/* Step 1: Email */}
					{step === 1 && (
						<form className="w-full space-y-4" onSubmit={handleEmailNext}>
							<div className="space-y-2">
								<label htmlFor="email" className="block text-sm font-medium text-gray-700">
									Email Address
								</label>
								<input
									id="email"
									name="email"
									type="email"
									placeholder="Enter your email"
									value={email}
									onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }}
									required
									autoFocus
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
								/>
							</div>
							{errorMessage && (
								<div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{errorMessage}</div>
							)}
							<button
								type="submit"
								className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition duration-300 shadow-md hover:shadow-lg font-semibold"
							>
								Next
							</button>
						</form>
					)}

					{/* Step 2: Password */}
					{step === 2 && (
						<form className="w-full space-y-4" onSubmit={handleLogin}>
							{/* Email display with change option */}
							<div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg border">
								<span className="text-sm text-gray-700 truncate">{email}</span>
								<button
									type="button"
									onClick={() => { setStep(1); setPassword(""); setErrorMessage(null); }}
									className="text-xs text-orange-500 hover:underline ml-2 shrink-0"
								>
									Change
								</button>
							</div>

							<div className="space-y-2">
								<label htmlFor="password" className="block text-sm font-medium text-gray-700">
									Password
								</label>
								<div className="relative">
									<input
										id="password"
										name="password"
										type={showPassword ? "text" : "password"}
										placeholder="Enter your password"
										value={password}
										onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
										required
										autoFocus
										className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
									>
										{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
									</button>
								</div>
							</div>

							<div className="flex justify-end">
								<Link
									href="/forgot-password"
									className="text-xs text-orange-500 hover:text-orange-700 hover:underline"
								>
									Forgot password?
								</Link>
							</div>

							{errorMessage && (
								<div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{errorMessage}</div>
							)}

							<button
								type="submit"
								disabled={loading}
								className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition duration-300 shadow-md hover:shadow-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
							>
								{loading ? "Signing in..." : "Sign In"}
							</button>
						</form>
					)}

					<p className="text-center text-sm text-gray-600">
						Don&apos;t have an account?{" "}
						<Link href="/register" className="font-semibold text-orange-600 hover:text-orange-700">
							Create account
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
