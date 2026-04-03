"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Paperclip,
  Mic,
  Send,
  Pill,
  Activity,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Bot,
  User,
  RefreshCw,
  FileText,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { chatbotService } from "@/services/chatbot.service";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PrescriptionExtraction {
  medicines: Array<Record<string, unknown>>;
  doctor_info: Record<string, unknown>;
  patient_info: Record<string, unknown>;
  diagnosis: string;
  warnings: string[];
  interaction_check: Record<string, unknown>;
}

export default function ChatbotPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  // const [selectedModel, setSelectedModel] = useState("pharma-expert");

  // const models = [
  //   { id: "pharma-expert", label: "Pharma Expert", pro: false },
  //   { id: "medical-ai-pro", label: "Medical AI Pro", pro: true },
  //   { id: "medical-ai-standard", label: "Medical AI Standard", pro: true },
  // ];
  const [activeTab, setActiveTab] = useState("general");
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Session & prescription state
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isUploadingPrescription, setIsUploadingPrescription] = useState(false);
  const [prescriptionUploaded, setPrescriptionUploaded] = useState(false);
  const [prescriptionExtraction, setPrescriptionExtraction] =
    useState<PrescriptionExtraction | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabDropdownRef = useRef<HTMLDivElement>(null);
  const [tabDropdownOpen, setTabDropdownOpen] = useState(false);

  // Close tab dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(e.target as Node)) {
        setTabDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Auto-send prefilled message from prescription scan page ───────────────
  useEffect(() => {
    const prefill = sessionStorage.getItem("chatbot_prefill");
    if (!prefill) return;
    sessionStorage.removeItem("chatbot_prefill");

    addMessage("user", prefill);
    setIsTyping(true);

    chatbotService.sendMessage(prefill, undefined)
      .then((res) => {
        const data = res.data as { message: string; sessionId: string } | undefined;
        if (data?.sessionId) setSessionId(data.sessionId);
        addMessage("assistant", data?.message ?? "I couldn't process your message. Please try again.");
      })
      .catch(() => {
        addMessage("assistant", "Sorry, I encountered an error. Please try again.");
      })
      .finally(() => {
        setIsTyping(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, timestamp: new Date() },
    ]);
  };

  // ── Handle prescription image upload ──────────────────────────────
  const handlePrescriptionUpload = async (file: File) => {
    setIsUploadingPrescription(true);
    addMessage("user", `📎 Uploading prescription: ${file.name}`);

    try {
      const res = await chatbotService.uploadPrescription(file, sessionId);
      const data = res.data;

      if (!data) throw new Error("Upload failed");

      setSessionId(data.sessionId);
      setPrescriptionUploaded(true);
      setPrescriptionExtraction(data.extraction ?? null);

      // Show system message from backend
      addMessage(
        "assistant",
        data.systemMessage ||
          "✅ Prescription uploaded. You can now ask questions about your medicines.",
      );
    } catch (err) {
      console.error("Prescription upload error:", err);
      addMessage(
        "assistant",
        "❌ Sorry, I couldn't process the prescription image. Please try again with a clearer photo.",
      );
    } finally {
      setIsUploadingPrescription(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Handle send (regular chat or prescription Q&A) ────────────────
  const handleSend = async () => {
    if (!message.trim() || isTyping || isUploadingPrescription) return;

    const userText = message.trim();
    addMessage("user", userText);
    setMessage("");
    setIsTyping(true);

    try {
      if (prescriptionUploaded && sessionId) {
        // Prescription Q&A mode
        const res = await chatbotService.askAboutPrescription(
          userText,
          sessionId,
        );
        const data = res.data;
        addMessage(
          "assistant",
          data?.answer ?? "I couldn't process your question. Please try again.",
        );
      } else {
        // Regular chatbot mode
        const res = await chatbotService.sendMessage(userText, sessionId);
        const data = res.data as
          | { message: string; sessionId: string }
          | undefined;
        if (data?.sessionId && !sessionId) setSessionId(data.sessionId);
        addMessage(
          "assistant",
          data?.message ?? "I couldn't process your message. Please try again.",
        );
      }
    } catch (err) {
      console.error("Chat error:", err);
      addMessage(
        "assistant",
        "Sorry, I encountered an error. Please try again.",
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input logic handled separately via voice route
  };

  const handleQuickQuestion = (question: string) => {
    setMessage(question);
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(undefined);
    setPrescriptionUploaded(false);
    setPrescriptionExtraction(null);
  };

  const handleClearPrescription = () => {
    setPrescriptionUploaded(false);
    setPrescriptionExtraction(null);
    addMessage(
      "assistant",
      "Prescription cleared. Switching back to general health chat.",
    );
  };

  const tabs = [
    { id: "general", label: "General Health", icon: Activity },
    { id: "medication", label: "Medication Info", icon: Pill },
    { id: "effects", label: "Side Effects", icon: AlertCircle },
    { id: "interactions", label: "Drug Interactions", icon: ShieldCheck },
  ];

  const quickQuestions = [
    {
      icon: Pill,
      text: "What are the side effects of Ibuprofen?",
    },
    {
      icon: Activity,
      text: "How do I manage high blood pressure?",
    },
    {
      icon: AlertCircle,
      text: "Can I take aspirin with blood thinners?",
    },
    {
      icon: ShieldCheck,
      text: "Check drug interactions for my medications",
    },
  ];

  const showEmptyState = messages.length === 0;

  return (
    <div className="h-[calc(100vh-130px)] lg:h-[calc(100vh-96px)] w-full flex flex-col p-0">
      {/* Header */}
      <div className="shrink-0 border-b backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto space-y-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="lg:text-lg text-sm font-semibold text-gray-900">
                Medical AI Assistant
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Online - Ready to help
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Category dropdown */}
            <div ref={tabDropdownRef} className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTabDropdownOpen((o) => !o)}
                className="gap-1.5 h-9 text-xs"
              >
                {(() => { const Icon = tabs.find((t) => t.id === activeTab)?.icon ?? Activity; return <Icon className="w-3.5 h-3.5" />; })()}
                <span className="hidden sm:inline">{tabs.find((t) => t.id === activeTab)?.label}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", tabDropdownOpen && "rotate-180")} />
              </Button>
              {tabDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 overflow-hidden">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setTabDropdownOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors",
                          activeTab === tab.id
                            ? "bg-orange-50 text-[#f25d25] font-medium"
                            : "text-gray-700 hover:bg-gray-50",
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {tab.label}
                        {activeTab === tab.id && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#f25d25]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome State */}
          {showEmptyState && (
            <div className="text-center mb-8 space-y-4">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 animate-pulse">
                  <div className="w-24 h-24 rounded-full bg-linear-to-br from-orange-300/40 via-red-300/40 to-pink-300/40 blur-2xl" />
                </div>
                <div className="relative w-24 h-24 rounded-full bg-linear-to-br from-orange-200/60 via-red-200/60 to-pink-200/60 blur-xl" />
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-gray-800">
                {getGreeting()}, <span className="text-gray-900">User</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-600">
                How Can I{" "}
                <span className="bg-linear-to-r from-[#f25d25] via-orange-500 to-red-500 bg-clip-text text-transparent font-semibold">
                  Assist You Today?
                </span>
              </p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-[#f25d25]" />
                Your AI-powered medical assistant
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 items-start",
                msg.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  msg.role === "user"
                    ? "bg-[#f25d25]"
                    : "bg-linear-to-br from-orange-500 to-red-500",
                )}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  "max-w-[75%] rounded-md px-4 py-1",
                  msg.role === "user"
                    ? "bg-[#f25d25] text-white"
                    : "bg-white border border-gray-200 text-gray-900",
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                <p
                  className={cn(
                    "text-xs mt- italic",
                    msg.role === "user" ? "text-white/60" : "text-gray-400",
                  )}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-md px-4 py-3">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="shrink-0 px-4 pb-2">
        <div className="max-w-4xl mx-auto">
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 text-center flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              This AI assistant provides general information only. Always
              consult with a healthcare professional for medical advice.
            </p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t backdrop-blur-sm">
        <div className="max-w-5xl mx-auto pt-4">
          {/* Model selector – Claude-style pills */}
          {/* <div className="mb-3 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                  selectedModel === m.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900",
                )}
              >
                {m.label}
                {m.pro && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1 py-px rounded",
                      selectedModel === m.id
                        ? "bg-[#f25d25] text-white"
                        : "bg-orange-100 text-[#f25d25]",
                    )}
                  >
                    Pro
                  </span>
                )}
              </button>
            ))}
          </div> */}

          {/* Prescription active badge */}
          {prescriptionUploaded && (
            <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full w-fit text-xs text-orange-700">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>
                Prescription active —{" "}
                {prescriptionExtraction?.medicines?.length
                  ? `${prescriptionExtraction.medicines.length} medicine${prescriptionExtraction.medicines.length > 1 ? "s" : ""}`
                  : "ask me anything about it"}
              </span>
              <button
                onClick={handleClearPrescription}
                className="ml-1 rounded-full hover:bg-orange-200 p-0.5 transition-colors"
                title="Clear prescription"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-3">
            {/* Hidden file input for prescription */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePrescriptionUpload(file);
              }}
            />

            {/* Attachment Button → opens prescription file picker */}
            <Button
              variant="ghost"
              size="icon"
              disabled={isUploadingPrescription}
              onClick={() => fileInputRef.current?.click()}
              title="Upload prescription"
              className={cn(
                "h-10 w-10 rounded-full shrink-0",
                prescriptionUploaded
                  ? "bg-orange-100 hover:bg-orange-200 text-orange-600"
                  : "hover:bg-gray-100 text-gray-600",
              )}
            >
              {isUploadingPrescription ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : prescriptionUploaded ? (
                <FileText className="w-5 h-5" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </Button>

            {/* Input Field */}
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  prescriptionUploaded
                    ? "Ask about your prescription medicines..."
                    : "Ask me anything about medicines, health, interactions..."
                }
                className="pr-12 h-12 rounded-full border-gray-300 focus:border-[#f25d25] focus:ring-[#f25d25]"
              />
            </div>

            {/* Voice Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full shrink-0 transition-colors",
                isListening
                  ? "bg-red-100 hover:bg-red-200 text-red-600"
                  : "hover:bg-gray-100 text-gray-600",
              )}
              onClick={handleVoiceInput}
            >
              <Mic className="w-5 h-5" />
            </Button>

            {/* Send Button */}
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-[#f25d25] hover:bg-[#e04515] shadow-md shrink-0"
              onClick={handleSend}
              disabled={!message.trim() || isTyping || isUploadingPrescription}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* Upgrade prompt */}
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Use our faster AI on Pro Plan</span>
            <span>•</span>
            <Button
              variant="link"
              className="h-auto p-0 text-primary text-xs font-medium"
            >
              Upgrade
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
