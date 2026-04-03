"use client";

import {
	Bell,
	ShieldCheck,
	FileText,
	Pill,
	Search,
	ShieldPlus,
	AlertTriangle,
	Clock,
	Package,
	MapPin,
	Upload,
	ShoppingCart,
	CheckCircle,
	Lock,
	Heart,
	Droplet,
	Activity,
	Thermometer,
	Shield,
	Store,
	Star,
	Plus,
	Scan,
	TrendingDown,
	Zap,
	MessageCircle,
	Route,
	BarChart3,
	Siren,
	Phone,
	Users,
	CalendarClock,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
	const categories = [
		{ name: "Pain Relief", icon: AlertTriangle, color: "text-blue-600", bg: "bg-blue-50" },
		{ name: "Fever", icon: Thermometer, color: "text-red-600", bg: "bg-red-50" },
		{ name: "Diabetes", icon: Droplet, color: "text-purple-600", bg: "bg-purple-50" },
		{ name: "Heart Care", icon: Heart, color: "text-pink-600", bg: "bg-pink-50" },
		{ name: "Vitamins", icon: Activity, color: "text-green-600", bg: "bg-green-50" },
		{ name: "Skin Care", icon: ShieldPlus, color: "text-orange-600", bg: "bg-orange-50" },
	];

	const medicines = [
		{ name: "Paracetamol 500mg", manufacturer: "Cipla", price: 8.5, mrp: 12, rating: 4.5, available: 12 },
		{ name: "Dolo 650", manufacturer: "Micro Labs", price: 15, mrp: 20, rating: 4.8, available: 8 },
		{ name: "Crocin Advance", manufacturer: "GSK", price: 18, mrp: 24, rating: 4.6, available: 15 },
		{ name: "Azithromycin 500mg", manufacturer: "Sun Pharma", price: 85, mrp: 110, rating: 4.7, available: 5 },
	];

	return (
		<main className="min-h-screen bg-white">
			{/* Top Navigation */}
			<header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white shadow-sm">
				<div className="mx-auto max-w-300 px-4 py-3">
					<div className="flex items-center justify-between gap-4">
						{/* Logo */}
						<Link href="/" className="flex items-center gap-2 shrink-0">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F25D25]">
								<Pill className="h-5 w-5 text-white" />
							</div>
							<span className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
								QuickMedi
							</span>
						</Link>

						{/* Search Bar - Primary Focus */}
						<div className="hidden flex-1 max-w-2xl md:block">
							<div className="relative">
								<Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
								<input
									type="text"
									placeholder="Search medicines, brands, compositions…"
									className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-12 pr-4 text-sm focus:border-[#F25D25] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#F25D25]"
								/>
							</div>
						</div>

						{/* Right Actions */}
						<div className="flex items-center gap-3">
							<Link
								href="/login"
								className="hidden text-sm font-medium text-gray-700 transition hover:text-[#F25D25] md:block"
							>
								Login
							</Link>
							<Link
								href="/register"
								className="hidden rounded-lg bg-[#F25D25] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d94e1f] md:block"
							>
								Sign Up
							</Link>
						</div>
					</div>
				</div>
			</header>

			{/* Hero Section - AI Scanner First */}
			<section className="bg-linear-to-b from-orange-50/30 to-white py-16 pt-38">
				<div className="mx-auto max-w-300 px-4">
					<div className="grid items-center gap-12 md:grid-cols-2">
						{/* Left */}
						<div>
							<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2">
								<Scan className="h-4 w-4 text-[#F25D25]" />
								<span className="text-sm font-semibold text-[#F25D25]">AI-Powered Prescription Scanner</span>
							</div>
							<h1 className="text-5xl font-semibold leading-tight text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
								Upload Prescription,{" "}
								<span className="text-[#F25D25]">Get Medicines Instantly</span>
							</h1>
							<p className="mt-6 text-lg leading-relaxed text-gray-600">
								Simply scan your prescription image. Our AI reads it, checks drug interactions, 
								compares prices across pharmacies, and delivers to your doorstep.
							</p>
							
							{/* Key USPs */}
							<div className="mt-6 space-y-3">
								<div className="flex items-center gap-3">
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
										<CheckCircle className="h-4 w-4 text-green-600" />
									</div>
									<span className="text-gray-700">Instant Drug Interaction Check</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
										<CheckCircle className="h-4 w-4 text-green-600" />
									</div>
									<span className="text-gray-700">Real-Time Price Comparison Across Pharmacies</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
										<CheckCircle className="h-4 w-4 text-green-600" />
									</div>
									<span className="text-gray-700">Emergency Pharmacy Alerts (60-Second Response)</span>
								</div>
							</div>

							<div className="mt-8 flex flex-wrap gap-4">
								<button className="inline-flex items-center gap-2 rounded-lg bg-[#F25D25] px-8 py-4 text-lg font-semibold text-white transition hover:bg-[#d94e1f]">
									<Scan className="h-5 w-5" />
									Scan Prescription Now
								</button>
								<button className="inline-flex items-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition hover:border-[#F25D25] hover:text-[#F25D25]">
									<Search className="h-5 w-5" />
									Search Medicines
								</button>
							</div>
						</div>

						{/* Right - AI Scanner Demo */}
						<div className="hidden md:block">
							<div className="rounded-md border border-gray-200 bg-white p-6 shadow-xs">
								<div className="mb-4 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
											<Scan className="h-5 w-5 text-[#F25D25]" />
										</div>
										<div>
											<p className="font-semibold text-gray-900">AI Prescription Analysis</p>
											<p className="text-xs text-gray-500">Processing in 2.3 seconds...</p>
										</div>
									</div>
									<div className="flex h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
								</div>
								
								<div className="space-y-3">
									{/* Detected Medicine */}
									<div className="rounded-lg border border-green-200 bg-green-50 p-4">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<p className="font-semibold text-gray-900">Paracetamol 500mg</p>
												<p className="text-sm text-gray-600">Qty: 10 tablets</p>
												<p className="mt-1 text-xs text-green-700">✓ Available at 12 nearby stores</p>
											</div>
											<div className="text-right">
												<p className="text-lg font-bold text-[#F25D25]">₹8.50</p>
												<p className="text-xs text-gray-400 line-through">₹12.00</p>
												<p className="text-xs font-semibold text-green-600">Save ₹3.50</p>
											</div>
										</div>
									</div>

									{/* Interaction Check */}
									<div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3">
										<ShieldPlus className="h-5 w-5 text-blue-600" />
										<div className="flex-1">
											<p className="text-sm font-semibold text-blue-900">Drug Safety Check</p>
											<p className="text-xs text-blue-700">No interactions with your current medications</p>
										</div>
									</div>

									{/* Delivery */}
									<div className="flex items-center gap-3 rounded-lg bg-purple-50 p-3">
										<Clock className="h-5 w-5 text-purple-600" />
										<div className="flex-1">
											<p className="text-sm font-semibold text-purple-900">Fastest Delivery</p>
											<p className="text-xs text-purple-700">Apollo Pharmacy - 2.5 km away (30 min)</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Core Features - What Makes Us Different */}
			<section className="border-b border-gray-100 bg-white py-16">
				<div className="mx-auto max-w-300 px-4">
					<div className="mb-12 text-center">
						<h2 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
							Why 10,000+ Users Trust QuickMedi
						</h2>
						<p className="mt-3 text-lg text-gray-600">Real features that solve real problems</p>
					</div>
					
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{/* AI Prescription Scanner */}
						<div className="rounded-md border border-gray-200 bg-white p-6 transition hover:shadow-lg">
							<div className="flex h-14 w-14 items-center justify-center rounded-md bg-orange-100">
								<Scan className="h-7 w-7 text-[#F25D25]" />
							</div>
							<h3 className="mt-4 text-xl font-semibold text-gray-900">AI Prescription Scanner</h3>
							<p className="mt-2 text-gray-600">
								Upload photo of prescription. AI reads doctor's handwriting, extracts medicines, 
								verifies dosage, and creates instant order in 3 seconds.
							</p>
							<div className="mt-4 flex items-center gap-2 text-sm text-[#F25D25]">
								<Zap className="h-4 w-4" />
								<span className="font-semibold">98% accuracy rate</span>
							</div>
						</div>

						{/* Drug Interaction Checker */}
						<div className="rounded-md border border-gray-200 bg-white p-6 transition hover:shadow-lg">
							<div className="flex h-14 w-14 items-center justify-center rounded-md bg-blue-100">
								<ShieldPlus className="h-7 w-7 text-blue-600" />
							</div>
							<h3 className="mt-4 text-xl font-semibold text-gray-900">Drug Interaction Checker</h3>
							<p className="mt-2 text-gray-600">
								Automatically checks if new medicines interact with your current medications. 
								Alerts you to potential risks before you order.
							</p>
							<div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
								<ShieldCheck className="h-4 w-4" />
								<span className="font-semibold">Covers 50,000+ medicines</span>
							</div>
						</div>

						{/* Emergency Pharmacy Alert */}
						<div className="rounded-md border border-red-200 bg-red-50 p-6 transition hover:shadow-lg">
							<div className="flex h-14 w-14 items-center justify-center rounded-md bg-red-100">
								<Siren className="h-7 w-7 text-red-600" />
							</div>
							<h3 className="mt-4 text-xl font-semibold text-gray-900">Emergency Pharmacy (60 sec)</h3>
							<p className="mt-2 text-gray-600">
								One tap sends alert to all nearby pharmacies. First to accept gets the order. 
								Urgency timer runs. Auto-escalates if no response.
							</p>
							<div className="mt-4 flex items-center gap-2 text-sm text-red-600">
								<Phone className="h-4 w-4" />
								<span className="font-semibold">Avg response: 42 seconds</span>
							</div>
						</div>

						{/* Real-Time Price Comparison */}
						<div className="rounded-md border border-gray-200 bg-white p-6 transition hover:shadow-lg">
							<div className="flex h-14 w-14 items-center justify-center rounded-md bg-green-100">
								<TrendingDown className="h-7 w-7 text-green-600" />
							</div>
							<h3 className="mt-4 text-xl font-semibold text-gray-900">Real-Time Price Comparison</h3>
							<p className="mt-2 text-gray-600">
								Compare prices across 500+ pharmacies instantly. See distance, delivery time, 
								and availability. Always get the best deal.
							</p>
							<div className="mt-4 flex items-center gap-2 text-sm text-green-600">
								<Zap className="h-4 w-4" />
								<span className="font-semibold">Save up to 40% on medicines</span>
							</div>
						</div>

						{/* AI Health Chatbot */}
						<div className="rounded-md border border-gray-200 bg-white p-6 transition hover:shadow-lg">
							<div className="flex h-14 w-14 items-center justify-center rounded-md bg-purple-100">
								<MessageCircle className="h-7 w-7 text-purple-600" />
							</div>
							<h3 className="mt-4 text-xl font-semibold text-gray-900">AI Health Assistant</h3>
							<p className="mt-2 text-gray-600">
								Ask questions about symptoms, medicine usage, side effects. Get instant answers 
								backed by medical data and verified sources.
							</p>
							<div className="mt-4 flex items-center gap-2 text-sm text-purple-600">
								<MessageCircle className="h-4 w-4" />
								<span className="font-semibold">24/7 instant responses</span>
							</div>
						</div>

						{/* Smart Tracking */}
						<div className="rounded-md border border-gray-200 bg-white p-6 transition hover:shadow-lg">
							<div className="flex h-14 w-14 items-center justify-center rounded-md bg-indigo-100">
								<Route className="h-7 w-7 text-indigo-600" />
							</div>
							<h3 className="mt-4 text-xl font-semibold text-gray-900">Real-Time Order Tracking</h3>
							<p className="mt-2 text-gray-600">
								Track your order from pharmacy to doorstep. See live location, estimated arrival, 
								and delivery person details in real-time.
							</p>
							<div className="mt-4 flex items-center gap-2 text-sm text-indigo-600">
								<MapPin className="h-4 w-4" />
								<span className="font-semibold">Live GPS tracking</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Emergency System Deep Dive */}
			<section className="bg-linear-to-br from-red-50 via-orange-50 to-white py-16">
				<div className="mx-auto max-w-300 px-4">
					<div className="mb-12 text-center">
						<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2">
							<Siren className="h-4 w-4 text-red-600" />
							<span className="text-sm font-semibold text-red-600">Life-Saving Feature</span>
						</div>
						<h2 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
							Emergency Medicine Delivery in Under 60 Seconds
						</h2>
						<p className="mt-3 text-lg text-gray-600">
							Not just a button. A real-time logistics + trust system that saves lives.
						</p>
					</div>

					<div className="grid gap-8 md:grid-cols-3">
						{/* Step 1 - User Triggers */}
						<div className="rounded-md border border-red-200 bg-white p-6">
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
								<span className="text-xl font-bold text-red-600">1</span>
							</div>
							<h3 className="text-xl font-semibold text-gray-900">User Triggers Emergency</h3>
							<p className="mt-3 text-gray-600">
								One tap on emergency button. Instantly alerts ALL pharmacies within 5km radius. 
								No forms, no search needed.
							</p>
							<div className="mt-4 space-y-2">
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<CheckCircle className="h-4 w-4 text-green-600" />
									<span>Automatic location detection</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<CheckCircle className="h-4 w-4 text-green-600" />
									<span>Priority medicine list sent</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<CheckCircle className="h-4 w-4 text-green-600" />
									<span>Family contacts notified</span>
								</div>
							</div>
						</div>

						{/* Step 2 - Pharmacy Responds */}
						<div className="rounded-md border border-orange-200 bg-white p-6">
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
								<span className="text-xl font-bold text-[#F25D25]">2</span>
							</div>
							<h3 className="text-xl font-semibold text-gray-900">Pharmacy Accepts (60s Timer)</h3>
							<p className="mt-3 text-gray-600">
								First pharmacy to accept within 60 seconds gets the order. Their response time 
								affects their Emergency Score for future priority.
							</p>
							<div className="mt-4 space-y-2">
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<Clock className="h-4 w-4 text-orange-600" />
									<span>60-second countdown starts</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<BarChart3 className="h-4 w-4 text-orange-600" />
									<span>Response time tracked publicly</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<Users className="h-4 w-4 text-orange-600" />
									<span>Pharmacy ratings updated</span>
								</div>
							</div>
						</div>

						{/* Step 3 - Auto Escalation */}
						<div className="rounded-md border border-indigo-200 bg-white p-6">
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
								<span className="text-xl font-bold text-indigo-600">3</span>
							</div>
							<h3 className="text-xl font-semibold text-gray-900">Auto-Escalation if No Response</h3>
							<p className="mt-3 text-gray-600">
								If no pharmacy responds in 60 seconds, system automatically expands radius, 
								alerts ambulance services, and notifies admin for manual intervention.
							</p>
							<div className="mt-4 space-y-2">
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<MapPin className="h-4 w-4 text-indigo-600" />
									<span>Expand search to 10km radius</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<Phone className="h-4 w-4 text-indigo-600" />
									<span>Call nearest ambulance service</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-gray-700">
									<Users className="h-4 w-4 text-indigo-600" />
									<span>Admin team manually intervenes</span>
								</div>
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="mt-12 grid gap-6 rounded-md border border-red-200 bg-white p-8 md:grid-cols-4">
						<div className="text-center">
							<p className="text-3xl font-bold text-[#F25D25]">42s</p>
							<p className="mt-1 text-sm text-gray-600">Average Response Time</p>
						</div>
						<div className="text-center">
							<p className="text-3xl font-bold text-[#F25D25]">98.2%</p>
							<p className="mt-1 text-sm text-gray-600">Acceptance Rate</p>
						</div>
						<div className="text-center">
							<p className="text-3xl font-bold text-[#F25D25]">24/7</p>
							<p className="mt-1 text-sm text-gray-600">Always Available</p>
						</div>
						<div className="text-center">
							<p className="text-3xl font-bold text-[#F25D25]">5km</p>
							<p className="mt-1 text-sm text-gray-600">Initial Alert Radius</p>
						</div>
					</div>
				</div>
			</section>

			{/* Drug Interaction Demo */}
			<section className="border-y border-gray-100 bg-white py-16">
				<div className="mx-auto max-w-300 px-4">
					<div className="grid items-center gap-12 md:grid-cols-2">
						{/* Left - Explanation */}
						<div>
							<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2">
								<ShieldPlus className="h-4 w-4 text-blue-600" />
								<span className="text-sm font-semibold text-blue-600">Safety First</span>
							</div>
							<h2 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
								Never Worry About Drug Interactions Again
							</h2>
							<p className="mt-4 text-lg text-gray-600">
								Our AI automatically checks every new medicine against your current medications, 
								supplements, and medical history. Warns you before you order.
							</p>
							<div className="mt-6 space-y-4">
								<div className="flex items-start gap-3">
									<div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
										<CheckCircle className="h-4 w-4 text-blue-600" />
									</div>
									<div>
										<p className="font-semibold text-gray-900">Real-Time Analysis</p>
										<p className="text-sm text-gray-600">Checks interactions in under 2 seconds using medical databases</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
										<CheckCircle className="h-4 w-4 text-blue-600" />
									</div>
									<div>
										<p className="font-semibold text-gray-900">50,000+ Medicines Covered</p>
										<p className="text-sm text-gray-600">Comprehensive database of all Indian medicines and generics</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
										<CheckCircle className="h-4 w-4 text-blue-600" />
									</div>
									<div>
										<p className="font-semibold text-gray-900">Severity Levels Explained</p>
										<p className="text-sm text-gray-600">Clear warnings (Minor/Moderate/Severe) with doctor consultation advice</p>
									</div>
								</div>
							</div>
						</div>

						{/* Right - Interactive Demo */}
						<div className="rounded-md border border-gray-200 bg-linear-to-br from-blue-50 to-white p-6 shadow-xl">
							<div className="mb-4 flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
									<ShieldPlus className="h-5 w-5 text-blue-600" />
								</div>
								<div>
									<p className="font-semibold text-gray-900">Interaction Check</p>
									<p className="text-xs text-gray-500">Analyzing 3 medicines...</p>
								</div>
							</div>

							<div className="space-y-3">
								{/* Current Medicines */}
								<div className="rounded-lg bg-white p-4 shadow-sm">
									<p className="mb-2 text-xs font-semibold uppercase text-gray-500">Your Current Medicines</p>
									<div className="space-y-2">
										<div className="flex items-center gap-2 text-sm">
											<div className="h-2 w-2 rounded-full bg-green-500"></div>
											<span className="text-gray-800">Amlodipine 5mg (Blood Pressure)</span>
										</div>
										<div className="flex items-center gap-2 text-sm">
											<div className="h-2 w-2 rounded-full bg-green-500"></div>
											<span className="text-gray-800">Metformin 500mg (Diabetes)</span>
										</div>
									</div>
								</div>

								{/* New Medicine Being Added */}
								<div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
									<p className="mb-2 text-xs font-semibold uppercase text-blue-700">Adding New Medicine</p>
									<div className="flex items-center gap-2 text-sm">
										<div className="h-2 w-2 rounded-full bg-blue-500"></div>
										<span className="font-semibold text-gray-900">Ibuprofen 400mg (Pain Relief)</span>
									</div>
								</div>

								{/* Warning Result */}
								<div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4">
									<div className="flex items-start gap-3">
										<AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
										<div>
											<p className="font-semibold text-yellow-900">⚠️ Moderate Interaction Detected</p>
											<p className="mt-1 text-sm text-yellow-800">
												Ibuprofen may reduce the effectiveness of Amlodipine (blood pressure medicine).
											</p>
											<p className="mt-2 text-xs font-semibold text-yellow-900">
												→ Consult doctor before taking. Consider Paracetamol as safer alternative.
											</p>
										</div>
									</div>
								</div>

								{/* Action Buttons */}
								<div className="flex gap-2">
									<button className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white">
										Consult Doctor
									</button>
									<button className="flex-1 rounded-lg border-2 border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700">
										View Alternatives
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Category Section */}
			<section className="bg-gray-50 py-12">
				<div className="mx-auto max-w-300 px-4">
					<h2 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
						Shop by Category
					</h2>
					<div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
						{categories.map((cat) => (
							<button
								key={cat.name}
								className="flex flex-col items-center gap-3 rounded-md border border-gray-200 bg-white p-6 transition hover:border-[#F25D25] hover:shadow-md"
							>
								<div className={`flex h-14 w-14 items-center justify-center rounded-full ${cat.bg}`}>
									<cat.icon className={`h-7 w-7 ${cat.color}`} />
								</div>
								<span className="text-center font-medium text-gray-800">{cat.name}</span>
							</button>
						))}
					</div>
				</div>
			</section>

			{/* Featured Medicines */}
			<section className="bg-white py-12">
				<div className="mx-auto max-w-300 px-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
								Popular Medicines Near You
							</h2>
							<p className="mt-1 text-sm text-gray-600">Compare prices from multiple pharmacies instantly</p>
						</div>
						<button className="text-sm font-medium text-[#F25D25] hover:underline">View All →</button>
					</div>
					<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{medicines.map((med) => (
							<div
								key={med.name}
								className="rounded-md border border-gray-200 bg-white p-4 transition hover:shadow-lg"
							>
								<div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-gray-50">
									<Package className="h-12 w-12 text-gray-300" />
								</div>
								<h3 className="font-semibold text-gray-900">{med.name}</h3>
								<p className="mt-1 text-sm text-gray-500">{med.manufacturer}</p>
								<div className="mt-2 flex items-center justify-between">
									<div className="flex items-center gap-1">
										<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
										<span className="text-sm font-medium text-gray-700">{med.rating}</span>
									</div>
									<div className="flex items-center gap-1 text-xs text-gray-600">
										<MapPin className="h-3 w-3" />
										<span>{med.available} stores</span>
									</div>
								</div>
								<div className="mt-3 flex items-center justify-between">
									<div>
										<p className="text-xl font-bold text-gray-900">₹{med.price}</p>
										<div className="flex items-center gap-2">
											<p className="text-xs text-gray-400 line-through">₹{med.mrp}</p>
											<p className="text-xs font-semibold text-green-600">Save ₹{(med.mrp - med.price).toFixed(2)}</p>
										</div>
									</div>
									<button className="rounded-lg bg-[#F25D25] p-2 text-white transition hover:bg-[#d94e1f]">
										<Plus className="h-5 w-5" />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Why QuickMedi */}
			<section className="border-y border-gray-100 bg-gray-50 py-12">
				<div className="mx-auto max-w-300 px-4">
					<h2 className="text-center text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
						Why Choose QuickMedi
					</h2>
					<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{[
							{ icon: ShieldCheck, title: "Verified Pharmacies", desc: "Only licensed and certified stores" },
							{ icon: FileText, title: "AI Prescription Analysis", desc: "Smart medicine detection" },
							{ icon: Lock, title: "Secure Payments", desc: "100% safe transactions" },
							{ icon: Clock, title: "24/7 Support", desc: "Always available for help" },
						].map((item) => (
							<div key={item.title} className="text-center">
								<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
									<item.icon className="h-8 w-8 text-[#F25D25]" />
								</div>
								<h3 className="mt-4 font-semibold text-gray-900">{item.title}</h3>
								<p className="mt-2 text-sm text-gray-600">{item.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* For Pharmacies - Vendor Platform */}
			<section className="bg-linear-to-br from-indigo-50 via-purple-50 to-white py-16">
				<div className="mx-auto max-w-300 px-4">
					<div className="mb-12 text-center">
						<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2">
							<Store className="h-4 w-4 text-indigo-600" />
							<span className="text-sm font-semibold text-indigo-600">For Pharmacy Partners</span>
						</div>
						<h2 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
							Grow Your Pharmacy Business 10x with QuickMedi
						</h2>
						<p className="mt-3 text-lg text-gray-600">
							Complete digital transformation with AI-powered tools, emergency orders, and real-time analytics
						</p>
					</div>

					<div className="grid gap-8 lg:grid-cols-2">
						{/* Left - Features Grid */}
						<div className="space-y-4">
							<div className="rounded-md border border-indigo-200 bg-white p-5 transition hover:shadow-lg">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
										<BarChart3 className="h-6 w-6 text-indigo-600" />
									</div>
									<div>
										<h3 className="font-semibold text-gray-900">Real-Time Analytics Dashboard</h3>
										<p className="mt-1 text-sm text-gray-600">
											Track sales, inventory turnover, peak hours, best-selling medicines, and revenue in real-time
										</p>
									</div>
								</div>
							</div>

							<div className="rounded-md border border-red-200 bg-white p-5 transition hover:shadow-lg">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100">
										<Siren className="h-6 w-6 text-red-600" />
									</div>
									<div>
										<h3 className="font-semibold text-gray-900">Emergency Alert Priority System</h3>
										<p className="mt-1 text-sm text-gray-600">
											Get emergency orders first. Your 60-second response time builds Emergency Score for future priority
										</p>
									</div>
								</div>
							</div>

							<div className="rounded-md border border-green-200 bg-white p-5 transition hover:shadow-lg">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100">
										<Package className="h-6 w-6 text-green-600" />
									</div>
									<div>
										<h3 className="font-semibold text-gray-900">Smart Inventory Management</h3>
										<p className="mt-1 text-sm text-gray-600">
											AI predicts demand, alerts low stock, suggests reorder quantities, tracks expiry dates automatically
										</p>
									</div>
								</div>
							</div>

							<div className="rounded-md border border-purple-200 bg-white p-5 transition hover:shadow-lg">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100">
										<Zap className="h-6 w-6 text-purple-600" />
									</div>
									<div>
										<h3 className="font-semibold text-gray-900">AI Alternative Suggestions</h3>
										<p className="mt-1 text-sm text-gray-600">
											When medicine is out of stock, AI suggests verified alternatives with same composition automatically
										</p>
									</div>
								</div>
							</div>

							<div className="rounded-md border border-orange-200 bg-white p-5 transition hover:shadow-lg">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100">
										<CalendarClock className="h-6 w-6 text-[#F25D25]" />
									</div>
									<div>
										<h3 className="font-semibold text-gray-900">Subscription Orders & Reminders</h3>
										<p className="mt-1 text-sm text-gray-600">
											Get recurring orders automatically. System reminds patients before refills, you get guaranteed revenue
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Right - Dashboard Mockup */}
						<div className="rounded-md border border-indigo-200 bg-white p-6 shadow-2xl">
							<div className="mb-4 flex items-center justify-between">
								<h3 className="font-semibold text-gray-900">Vendor Dashboard</h3>
								<div className="flex items-center gap-2">
									<div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
									<span className="text-xs text-gray-600">Live</span>
								</div>
							</div>

							{/* Stats Grid */}
							<div className="mb-4 grid grid-cols-2 gap-3">
								<div className="rounded-lg bg-linear-to-br from-green-50 to-green-100 p-4">
									<p className="text-xs text-green-700">Today's Revenue</p>
									<p className="mt-1 text-2xl font-bold text-green-900">₹12,450</p>
									<p className="mt-1 text-xs text-green-600">↑ 18% from yesterday</p>
								</div>
								<div className="rounded-lg bg-linear-to-br from-blue-50 to-blue-100 p-4">
									<p className="text-xs text-blue-700">Active Orders</p>
									<p className="mt-1 text-2xl font-bold text-blue-900">34</p>
									<p className="mt-1 text-xs text-blue-600">8 pending pickup</p>
								</div>
							</div>

							{/* Emergency Alert */}
							<div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<Siren className="h-5 w-5 text-red-600" />
										<div>
											<p className="text-sm font-semibold text-red-900">Emergency Order Alert</p>
											<p className="text-xs text-red-700">2.3 km away • Paracetamol 500mg x10</p>
										</div>
									</div>
									<div className="text-center">
										<p className="text-xs text-red-600">Timer</p>
										<p className="text-lg font-bold text-red-600">45s</p>
									</div>
								</div>
								<div className="mt-3 flex gap-2">
									<button className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white">
										Accept Order
									</button>
									<button className="rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-700">
										Skip
									</button>
								</div>
							</div>

							{/* Inventory Low Stock Alert */}
							<div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
								<div className="flex items-start gap-3">
									<AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
									<div className="flex-1">
										<p className="text-sm font-semibold text-yellow-900">3 Items Low Stock</p>
										<p className="text-xs text-yellow-700">Aspirin, Insulin, Cough Syrup</p>
										<button className="mt-2 text-xs font-semibold text-yellow-900 underline">View & Reorder</button>
									</div>
								</div>
							</div>

							{/* CTA */}
							<div className="mt-6">
								<Link
									href="/register"
									className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F25D25] py-3 font-semibold text-white transition hover:bg-[#d94e1f]"
								>
									<Store className="h-5 w-5" />
									Register Your Pharmacy
								</Link>
								<p className="mt-2 text-center text-xs text-gray-600">
									Free for first 3 months • No setup cost • Commission only
								</p>
							</div>
						</div>
					</div>

					{/* Vendor Stats */}
					<div className="mt-12 grid gap-6 rounded-md border border-indigo-200 bg-white p-8 md:grid-cols-4">
						<div className="text-center">
							<p className="text-3xl font-bold text-[#F25D25]">500+</p>
							<p className="mt-1 text-sm text-gray-600">Partner Pharmacies</p>
						</div>
						<div className="text-center">
							<p className="text-3xl font-bold text-[#F25D25]">₹2.5Cr</p>
							<p className="mt-1 text-sm text-gray-600">Total Revenue Generated</p>
						</div>
						<div className="text-center">
							<p className="text-3xl font-bold text-[#F25D25]">98.2%</p>
							<p className="mt-1 text-sm text-gray-600">Vendor Satisfaction Rate</p>
						</div>
						<div className="text-center">
							<p className="text-3xl font-bold text-[#F25D25]">24/7</p>
							<p className="mt-1 text-sm text-gray-600">Support for Partners</p>
						</div>
					</div>
				</div>
			</section>

			{/* Security & Compliance Strip */}
			<section className="border-y border-gray-200 bg-gray-100 py-8">
				<div className="mx-auto max-w-300 px-4">
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{[
							{ icon: Lock, text: "Secure Login" },
							{ icon: Shield, text: "Data Encryption" },
							{ icon: ShieldCheck, text: "Verified Licenses" },
							{ icon: CheckCircle, text: "Regulatory Compliant" },
						].map((item) => (
							<div key={item.text} className="flex items-center gap-3">
								<item.icon className="h-6 w-6 shrink-0 text-gray-600" />
								<span className="text-sm font-medium text-gray-700">{item.text}</span>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-gray-900 text-gray-300">
				<div className="mx-auto max-w-300 px-4 py-12">
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
						<div>
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F25D25]">
									<Pill className="h-4 w-4 text-white" />
								</div>
								<span className="text-lg font-semibold text-white">QuickMedi</span>
							</div>
							<p className="mt-3 text-sm leading-relaxed">
								Your trusted healthcare partner for affordable medicines and smart assistance.
							</p>
						</div>
						<div>
							<h4 className="font-semibold text-white">For Patients</h4>
							<ul className="mt-3 space-y-2 text-sm">
								<li><Link href="#" className="hover:text-white">Order Medicines</Link></li>
								<li><Link href="#" className="hover:text-white">Upload Prescription</Link></li>
								<li><Link href="#" className="hover:text-white">Lab Tests</Link></li>
								<li><Link href="#" className="hover:text-white">Track Order</Link></li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold text-white">For Pharmacies</h4>
							<ul className="mt-3 space-y-2 text-sm">
								<li><Link href="#" className="hover:text-white">Register Store</Link></li>
								<li><Link href="#" className="hover:text-white">Vendor Dashboard</Link></li>
								<li><Link href="#" className="hover:text-white">Inventory Management</Link></li>
								<li><Link href="#" className="hover:text-white">Analytics</Link></li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold text-white">Company</h4>
							<ul className="mt-3 space-y-2 text-sm">
								<li><Link href="#" className="hover:text-white">About Us</Link></li>
								<li><Link href="#" className="hover:text-white">Careers</Link></li>
								<li><Link href="#" className="hover:text-white">Blog</Link></li>
								<li><Link href="#" className="hover:text-white">Contact</Link></li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold text-white">Support</h4>
							<ul className="mt-3 space-y-2 text-sm">
								<li><Link href="#" className="hover:text-white">Privacy Policy</Link></li>
								<li><Link href="#" className="hover:text-white">Terms & Conditions</Link></li>
								<li><Link href="#" className="hover:text-white">Refund Policy</Link></li>
								<li><Link href="#" className="hover:text-white">Help Center</Link></li>
							</ul>
						</div>
					</div>
					<div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm">
						© {new Date().getFullYear()} QuickMedi. All rights reserved.
					</div>
				</div>
			</footer>

			{/* Floating Cart Button (Mobile) */}
			<button className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#F25D25] text-white shadow-lg transition hover:bg-[#d94e1f] md:hidden">
				<ShoppingCart className="h-6 w-6" />
			</button>
		</main>
	);
}
