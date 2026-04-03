"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
	Package,
	CheckCircle,
	Truck,
	Home,
	MapPin,
	Phone,
	Mail,
	Calendar,
	Clock,
	ArrowLeft,
	Download,
	MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

type OrderStatus = "confirmed" | "packed" | "shipped" | "out-for-delivery" | "delivered";

type TrackingEvent = {
	status: string;
	timestamp: string;
	location: string;
	description: string;
	completed: boolean;
};

export default function TrackOrderPage() {
	const params = useParams();
	const orderId = params.id as string;

	const order = {
		id: `#${orderId.toUpperCase()}`,
		date: "March 5, 2026",
		expectedDelivery: "March 8, 2026",
		status: "out-for-delivery" as OrderStatus,
		trackingNumber: "TRK123456789",
		deliveryPartner: "QuickDeliver Express",
		deliveryPerson: {
			name: "Rajesh Kumar",
			phone: "+91 98765 43210",
			image: null,
		},
		address: {
			name: "John Doe",
			phone: "+91 98765 43210",
			addressLine1: "123 MG Road",
			addressLine2: "Near City Mall",
			city: "Bangalore",
			state: "Karnataka",
			pincode: "560001",
		},
		items: [
			{
				id: "1",
				name: "Paracetamol 500mg",
				manufacturer: "Generic Pharma",
				quantity: 2,
				price: 120,
			},
			{
				id: "2",
				name: "Amoxicillin 250mg",
				manufacturer: "MedLife",
				quantity: 1,
				price: 180,
			},
			{
				id: "3",
				name: "Vitamin D3",
				manufacturer: "HealthPlus",
				quantity: 1,
				price: 250,
			},
		],
		total: 550,
	};

	const trackingTimeline: TrackingEvent[] = [
		{
			status: "Order Confirmed",
			timestamp: "March 5, 2026 10:30 AM",
			location: "Bangalore, Karnataka",
			description: "Your order has been confirmed and is being processed",
			completed: true,
		},
		{
			status: "Packed",
			timestamp: "March 5, 2026 02:15 PM",
			location: "QuickMeds Warehouse, Bangalore",
			description: "Your order has been packed and ready for shipment",
			completed: true,
		},
		{
			status: "Shipped",
			timestamp: "March 6, 2026 09:00 AM",
			location: "Bangalore Distribution Center",
			description: "Your order has been shipped and in transit",
			completed: true,
		},
		{
			status: "Out for Delivery",
			timestamp: "March 7, 2026 07:30 AM",
			location: "Bangalore Local Hub",
			description: "Your order is out for delivery and will reach you soon",
			completed: true,
		},
		{
			status: "Delivered",
			timestamp: "Expected by March 8, 2026",
			location: order.address.addressLine1,
			description: "Your order will be delivered to your address",
			completed: false,
		},
	];

	const currentStep = trackingTimeline.findIndex((event) => !event.completed);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Track Order</h1>
					<p className="text-gray-600">Order ID: {order.id}</p>
				</div>
				<Link href="/user/order/history">
					<Button variant="outline">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Orders
					</Button>
				</Link>
			</div>

			{/* Status Banner */}
			<div className="bg-linear-to-r from-teal-600 to-blue-600 rounded-md p-6 text-white">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<div className="flex items-center gap-3 mb-2">
							<Truck className="w-8 h-8" />
							<div>
								<p className="text-sm opacity-90">Current Status</p>
								<p className="text-2xl font-bold">Out for Delivery</p>
							</div>
						</div>
						<p className="text-sm opacity-90">
							Expected delivery by <strong>{order.expectedDelivery}</strong>
						</p>
					</div>
					<div className="flex gap-3">
						<Button variant="outline" className="bg-white text-teal-600 hover:bg-gray-50">
							<MessageCircle className="w-4 h-4 mr-2" />
							Contact Support
						</Button>
						<Button variant="outline" className="bg-white text-teal-600 hover:bg-gray-50">
							<Download className="w-4 h-4 mr-2" />
							Invoice
						</Button>
					</div>
				</div>
			</div>

			<div className="grid lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Tracking Timeline */}
					<div className="bg-white rounded-md border border-gray-200 p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-6">Tracking Timeline</h2>

						<div className="space-y-6">
							{trackingTimeline.map((event, index) => (
								<div key={index} className="flex gap-4">
									{/* Icon */}
									<div className="flex flex-col items-center">
										<div
											className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shrink-0 ${
												event.completed
													? "bg-green-600 border-green-600"
													: index === currentStep
													? "bg-teal-600 border-teal-600 animate-pulse"
													: "bg-gray-200 border-gray-300"
											}`}
										>
											{event.completed ? (
												<CheckCircle className="w-6 h-6 text-white" />
											) : index === currentStep ? (
												<Truck className="w-6 h-6 text-white" />
											) : (
												<Package className="w-6 h-6 text-gray-400" />
											)}
										</div>
										{index < trackingTimeline.length - 1 && (
											<div
												className={`w-0.5 flex-1 mt-2 ${
													event.completed ? "bg-green-600" : "bg-gray-300"
												}`}
												style={{ minHeight: "40px" }}
											/>
										)}
									</div>

									{/* Content */}
									<div className="flex-1 pb-6">
										<div className="flex items-start justify-between gap-4 mb-1">
											<h3
												className={`font-bold ${
													event.completed || index === currentStep
														? "text-gray-900"
														: "text-gray-400"
												}`}
											>
												{event.status}
											</h3>
											{event.completed && (
												<Badge className="bg-green-100 text-green-800 border-green-200">
													Completed
												</Badge>
											)}
											{index === currentStep && (
												<Badge className="bg-teal-100 text-teal-800 border-teal-200">
													In Progress
												</Badge>
											)}
										</div>
										<p
											className={`text-sm mb-1 ${
												event.completed || index === currentStep
													? "text-gray-600"
													: "text-gray-400"
											}`}
										>
											{event.description}
										</p>
										<div className="flex items-center gap-4 text-xs text-gray-500">
											<span className="flex items-center gap-1">
												<Clock className="w-3 h-3" />
												{event.timestamp}
											</span>
											<span className="flex items-center gap-1">
												<MapPin className="w-3 h-3" />
												{event.location}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Delivery Partner Info */}
					<div className="bg-white rounded-md border border-gray-200 p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Partner</h2>
						<div className="flex items-center gap-4 mb-4">
							<div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
								<Truck className="w-8 h-8 text-teal-600" />
							</div>
							<div className="flex-1">
								<p className="font-semibold text-gray-900 mb-1">
									{order.deliveryPartner}
								</p>
								<p className="text-sm text-gray-600">Tracking: {order.trackingNumber}</p>
							</div>
						</div>

						<div className="bg-gray-50 rounded-lg p-4">
							<p className="text-sm font-medium text-gray-700 mb-2">
								Delivery Person
							</p>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
										<span className="text-sm font-semibold text-gray-600">
											{order.deliveryPerson.name
												.split(" ")
												.map((n) => n[0])
												.join("")}
										</span>
									</div>
									<div>
										<p className="font-semibold text-gray-900">
											{order.deliveryPerson.name}
										</p>
										<p className="text-sm text-gray-600">
											{order.deliveryPerson.phone}
										</p>
									</div>
								</div>
								<Button size="sm" variant="outline">
									<Phone className="w-4 h-4 mr-2" />
									Call
								</Button>
							</div>
						</div>
					</div>

					{/* Delivery Address */}
					<div className="bg-white rounded-md border border-gray-200 p-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Address</h2>
						<div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
							<Home className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
							<div>
								<p className="font-semibold text-gray-900 mb-1">{order.address.name}</p>
								<p className="text-sm text-gray-600 mb-2">{order.address.phone}</p>
								<p className="text-sm text-gray-700">
									{order.address.addressLine1}
									{order.address.addressLine2 && `, ${order.address.addressLine2}`}
									<br />
									{order.address.city}, {order.address.state} - {order.address.pincode}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Order Summary Sidebar */}
				<div className="lg:col-span-1">
					<div className="bg-white rounded-md border border-gray-200 p-6 sticky top-6">
						<h2 className="text-xl font-bold text-gray-900 mb-4">Order Details</h2>

						{/* Order Info */}
						<div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
							<div className="flex items-center gap-2 text-sm">
								<Package className="w-4 h-4 text-gray-500" />
								<span className="text-gray-600">Order ID:</span>
								<span className="font-medium text-gray-900">{order.id}</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Calendar className="w-4 h-4 text-gray-500" />
								<span className="text-gray-600">Placed on:</span>
								<span className="font-medium text-gray-900">{order.date}</span>
							</div>
						</div>

						{/* Items */}
						<div className="mb-4 pb-4 border-b border-gray-200">
							<h3 className="font-semibold text-gray-900 mb-3">Items ({order.items.length})</h3>
							<div className="space-y-3">
								{order.items.map((item) => (
									<div key={item.id} className="flex items-start gap-3">
										<div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 border border-gray-200">
											<Package className="w-6 h-6 text-gray-400" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-gray-900 text-sm mb-1">
												{item.name}
											</p>
											<p className="text-xs text-gray-600 mb-1">
												{item.manufacturer}
											</p>
											<div className="flex items-center justify-between">
												<span className="text-xs text-gray-600">Qty: {item.quantity}</span>
												<span className="font-semibold text-sm text-gray-900">
													₹{(item.price * item.quantity).toFixed(0)}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Total */}
						<div className="flex items-center justify-between">
							<span className="font-semibold text-gray-900">Total Amount</span>
							<span className="text-2xl font-bold text-teal-600">₹{order.total}</span>
						</div>

						{/* Help */}
						<div className="mt-6 pt-6 border-t border-gray-200">
							<Button variant="outline" className="w-full">
								<Mail className="w-4 h-4 mr-2" />
								Need Help?
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
