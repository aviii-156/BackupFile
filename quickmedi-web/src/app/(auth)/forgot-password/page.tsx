"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HeartPulse, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { authService } from "@/services/auth.service";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage(null);

		if (!email.trim()) {
			setErrorMessage("Please enter your email address.");
			return;
		}

		setLoading(true);
		try {
			await authService.forgotPassword(email.trim());
			// Always show success (backend never reveals if email exists)
			setSent(true);
		} catch (err: any) {
			setErrorMessage(err.message || "Something went wrong. Please try again.");
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
						<p className="text-gray-500 mt-1 text-sm">Reset your password</p>
					</div>

					{!sent ? (
						<>
							<div className="text-center">
								<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 mb-3">
									<Mail className="w-6 h-6 text-orange-500" />
								</div>
								<h2 className="text-lg font-semibold text-gray-800">Forgot your password?</h2>
								<p className="text-sm text-gray-500 mt-1">
									Enter your registered email address and we'll send you a link to reset your password.
									Works for <span className="font-medium text-gray-700">users, vendors, and admins</span>.
								</p>
							</div>

							<form className="space-y-4" onSubmit={handleSubmit}>
								<div className="space-y-2">
									<label htmlFor="email" className="block text-sm font-medium text-gray-700">
										Email Address
									</label>
									<input
										id="email"
										type="email"
										placeholder="Enter your registered email"
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
									disabled={loading}
									className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition duration-300 shadow-md hover:shadow-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
								>
									{loading ? "Sending..." : "Send Reset Link"}
								</button>
							</form>
						</>
					) : (
						<div className="text-center space-y-4">
							<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
								<CheckCircle className="w-9 h-9 text-green-500" />
							</div>
							<h2 className="text-lg font-semibold text-gray-800">Check your inbox</h2>
							<p className="text-sm text-gray-500">
								If an account exists for <span className="font-medium text-gray-700">{email}</span>, you'll receive a password reset link shortly. The link expires in <span className="font-medium">15 minutes</span>.
							</p>
							<p className="text-xs text-gray-400">
								Didn't receive it? Check your spam folder or{" "}
								<button
									type="button"
									onClick={() => { setSent(false); setEmail(""); }}
									className="text-orange-500 hover:underline"
								>
									try again
								</button>
								.
							</p>
						</div>
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
