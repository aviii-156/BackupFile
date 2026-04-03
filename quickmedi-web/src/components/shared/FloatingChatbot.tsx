"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Send, Bot, User, Loader2, MessageCircle, X } from "lucide-react";

interface Message {
	id: number;
	text: string;
	sender: "user" | "bot";
	timestamp: Date;
}

export default function FloatingChatbot() {
	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([
		{
			id: 1,
			text: "Hello! I'm your QuickMedi AI assistant. How can I help you today?",
			sender: "bot",
			timestamp: new Date(),
		},
	]);
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const sendMessage = () => {
		if (!input.trim()) return;

		const userMessage: Message = {
			id: messages.length + 1,
			text: input,
			sender: "user",
			timestamp: new Date(),
		};

		setMessages([...messages, userMessage]);
		setInput("");
		setIsTyping(true);

		// Simulate bot response
		setTimeout(() => {
			const botMessage: Message = {
				id: messages.length + 2,
				text: "I understand your concern. Let me help you with that. For accurate medical advice, please consult with a healthcare professional.",
				sender: "bot",
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, botMessage]);
			setIsTyping(false);
		}, 1500);
	};

	const quickQuestions = [
		"What are the side effects of Paracetamol?",
		"How to take antibiotics properly?",
		"Can I take these medicines together?",
		"What time should I take my medicine?",
	];

	return (
		<>
			{/* Chat Window */}
			{isOpen && (
				<div className="fixed bottom-24 right-4 md:right-6 w-[calc(100%-2rem)] md:w-96 h-125 bg-white rounded-md border border-border shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-5 duration-300">
					{/* Header */}
					<div className="flex items-center justify-between p-4 border-b border-border bg-primary text-white rounded-t-xl">
						<div className="flex items-center gap-2">
							<Bot className="w-5 h-5" />
							<div>
								<h3 className="font-semibold text-sm">AI Health Assistant</h3>
								<p className="text-xs text-white/80">Online</p>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsOpen(false)}
							className="h-8 w-8 text-white hover:bg-white/20"
						>
							<X className="w-4 h-4" />
						</Button>
					</div>

					{/* Messages */}
					<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
						{messages.map((message) => (
							<div
								key={message.id}
								className={`flex gap-2 ${
									message.sender === "user" ? "justify-end" : "justify-start"
								}`}
							>
								{message.sender === "bot" && (
									<div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
										<Bot className="w-4 h-4" />
									</div>
								)}
								<div
									className={`max-w-[75%] px-3 py-2 rounded-lg ${
										message.sender === "user"
											? "bg-primary text-white"
											: "bg-white text-foreground shadow-sm"
									}`}
								>
									<p className="text-sm">{message.text}</p>
									<p
										className={`text-xs mt-1 ${
											message.sender === "user"
												? "text-white/70"
												: "text-muted-foreground"
										}`}
									>
										{message.timestamp.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
								{message.sender === "user" && (
									<div className="w-7 h-7 rounded-full bg-accent text-foreground flex items-center justify-center shrink-0">
										<User className="w-4 h-4" />
									</div>
								)}
							</div>
						))}
						{isTyping && (
							<div className="flex gap-2">
							<div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
									<Bot className="w-4 h-4" />
								</div>
								<div className="bg-white shadow-sm px-3 py-2 rounded-lg">
									<Loader2 className="w-4 h-4 text-primary animate-spin" />
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>

					{/* Quick Questions */}
					{messages.length === 1 && (
						<div className="px-4 py-3 bg-white border-t border-border">
							<p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
							<div className="space-y-1.5">
								{quickQuestions.slice(0, 2).map((question, idx) => (
									<button
										key={idx}
										onClick={() => {
											setInput(question);
										}}
										className="w-full text-left text-xs p-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors"
									>
										{question}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Input */}
					<div className="border-t border-border p-3 bg-white rounded-b-xl">
						<div className="flex gap-2">
							<Input
								placeholder="Type your message..."
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyPress={(e) => e.key === "Enter" && sendMessage()}
								className="flex-1 text-sm"
							/>
							<Button onClick={sendMessage} disabled={!input.trim()} size="icon" className="h-9 w-9">
								<Send className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Floating Button */}
			<Button
				onClick={() => setIsOpen(!isOpen)}
				className="fixed bottom-4 right-4 md:right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-primary hover:bg-primary/90 text-white"
				size="icon"
			>
				{isOpen ? (
					<X className="w-6 h-6" />
				) : (
					<MessageCircle className="w-6 h-6" />
				)}
			</Button>
		</>
	);
}
