"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { HeartPulse, Eye, EyeOff, ArrowLeft, CheckCircle, Lock, AlertCircle } from "lucide-react";
import { authService } from "@/services/auth.service";

function ResetPasswordForm() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// If no token in URL, show an error immediately
	const hasToken = !!token;

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage(null);

		if (!password || password.length < 8) {
			setErrorMessage("Password must be at least 8 characters.");
			return;
		}
		if (password !== confirmPassword) {
			setErrorMessage("Passwords do not match.");
			return;
		}

		setLoading(true);
		try {
			const res = await authService.resetPassword(token!, password);
			if (res.success) {
				setSuccess(true);
				// Redirect to login after 3 seconds
				setTimeout(() => router.push("/login"), 3000);
			} else {
				setErrorMessage(res.message || "Reset failed. Please try again.");
			}
		} catch (err: any) {
			setErrorMessage(err.message || "Something went wrong. The link may have expired.");
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
			<div className="w-full max-w-md mx-4">
				<div className="bg-white rounded-md shadow-xl p-8 space-y-6">
					{/* Logo */}
					<div className="text-center">
						<div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
							<HeartPulse className="h-7 w-7" />
						</div>
						<h1 className="text-3xl font-extrabold text-gray-900">QuickMedi</h1>
						<p className="text-gray-500 mt-1 text-sm">Set your new password</p>
					</div>

					{/* Invalid / missing token */}
					{!hasToken && (
						<div className="text-center space-y-4">
							<div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100">
								<AlertCircle className="w-7 h-7 text-red-500" />
							</div>
							<h2 className="text-lg font-semibold text-gray-800">Invalid reset link</h2>
							<p className="text-sm text-gray-500">
								This password reset link is invalid or missing. Please request a new one.
							</p>
							<Link
								href="/forgot-password"
								className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded-lg hover:bg-orange-600 transition font-semibold text-sm"
							>
								Request new link
							</Link>
						</div>
					)}

					{/* Success state */}
					{hasToken && success && (
						<div className="text-center space-y-4">
							<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
								<CheckCircle className="w-9 h-9 text-green-500" />
							</div>
							<h2 className="text-lg font-semibold text-gray-800">Password reset!</h2>
							<p className="text-sm text-gray-500">
								Your password has been updated successfully. Redirecting you to login…
							</p>
							<Link
								href="/login"
								className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded-lg hover:bg-orange-600 transition font-semibold text-sm"
							>
								Go to Login
							</Link>
						</div>
					)}

					{/* Reset form */}
					{hasToken && !success && (
						<>
							<div className="text-center">
								<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 mb-3">
									<Lock className="w-6 h-6 text-orange-500" />
								</div>
								<h2 className="text-lg font-semibold text-gray-800">Create new password</h2>
								<p className="text-sm text-gray-500 mt-1">
									Your new password must be at least 8 characters long.
								</p>
							</div>

							<form className="space-y-4" onSubmit={handleSubmit}>
								{/* New password */}
								<div className="space-y-2">
									<label htmlFor="password" className="block text-sm font-medium text-gray-700">
										New Password
									</label>
									<div className="relative">
										<input
											id="password"
											type={showPassword ? "text" : "password"}
											placeholder="Min. 8 characters"
											value={password}
											onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
											required
											autoFocus
											className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
										/>
										<button
											type="button"
											onClick={() => setShowPassword((v) => !v)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
										>
											{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
										</button>
									</div>
									{password && password.length < 8 && (
										<p className="text-xs text-red-500">At least 8 characters required</p>
									)}
								</div>

								{/* Confirm password */}
								<div className="space-y-2">
									<label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
										Confirm New Password
									</label>
									<div className="relative">
										<input
											id="confirmPassword"
											type={showConfirmPassword ? "text" : "password"}
											placeholder="Re-enter new password"
											value={confirmPassword}
											onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(null); }}
											required
											className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
										/>
										<button
											type="button"
											onClick={() => setShowConfirmPassword((v) => !v)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
										>
											{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
										</button>
									</div>
									{confirmPassword && password !== confirmPassword && (
										<p className="text-xs text-red-500">Passwords do not match</p>
									)}
									{confirmPassword && password === confirmPassword && password.length >= 8 && (
										<p className="text-xs text-green-600">✓ Passwords match</p>
									)}
								</div>

								{errorMessage && (
									<div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{errorMessage}</div>
								)}

								<button
									type="submit"
									disabled={loading}
									className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition duration-300 shadow-md hover:shadow-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
								>
									{loading ? "Resetting…" : "Reset Password"}
								</button>
							</form>
						</>
					)}

					<div className="text-center">
						<Link
							href="/login"
							className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition"
						>
							<ArrowLeft className="w-4 h-4" />
							Back to login
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={
			<div className="flex items-center justify-center min-h-screen bg-[#faf9f7]">
				<div className="text-gray-400 text-sm">Loading…</div>
			</div>
		}>
			<ResetPasswordForm />
		</Suspense>
	);
}
