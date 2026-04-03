"use client";

import React, { useState } from "react";

interface ForgotPasswordModalProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (email: string) => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
	open,
	onClose,
	onSubmit,
}) => {
	const [email, setEmail] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);

	const handleSubmit = () => {
		setLoading(true);
		setTimeout(() => {
			onSubmit(email);
			setLoading(false);
			setEmail("");
			onClose();
		}, 1000);
	};

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (!open) return null;

	return (
		<div
			onClick={handleOverlayClick}
			className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-60 flex justify-center items-center z-50"
		>
			<div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full">
				<div className="text-2xl font-semibold text-gray-700 mb-6 text-center">
					Forgot Password
				</div>

				<div className="mb-6">
					<label className="block text-sm font-medium mb-2 text-gray-700">
						Enter your email
					</label>
					<input
						type="email"
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="your.email@example.com"
						required
					/>
				</div>

				<div className="flex justify-between items-center gap-3">
					<button
						className="px-6 py-2 rounded-lg w-full font-semibold transition-all bg-gray-200 hover:bg-gray-300 text-gray-700"
						onClick={onClose}
						disabled={loading}
					>
						Cancel
					</button>
					<button
						className={`px-6 py-2 rounded-lg w-full font-semibold transition-all ${
							loading
								? "bg-gray-400 cursor-not-allowed"
								: "bg-orange-500 hover:bg-orange-600 text-white"
						}`}
						onClick={handleSubmit}
						disabled={loading}
					>
						{loading ? (
							<span className="flex items-center justify-center">
								<svg
									className="animate-spin h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
							</span>
						) : (
							"Send Reset Link"
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ForgotPasswordModal;
