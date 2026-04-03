import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { EmergencyProvider } from "@/context/EmergencyContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";

const poppins = Poppins({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	display: "swap",
	variable: "--font-poppins",
});

const inter = Inter({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600"],
	display: "swap",
	variable: "--font-inter",
});

export const metadata: Metadata = {
	title: "QuickMedi - Your Healthcare Companion",
	description: "Buy medicines and essentials quickly. Modern healthcare platform for all your medical needs.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${poppins.variable} ${inter.variable} font-sans antialiased`}>
				<AuthProvider>
					<LanguageProvider>
						<NotificationProvider>
							<CartProvider>
								<EmergencyProvider>
									{children}
								</EmergencyProvider>
							</CartProvider>
						</NotificationProvider>
					</LanguageProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
