import { useState, useRef, useEffect } from "react";
import {
  ShoppingCart,
  AlertCircle,
  Info,
  Send,
  Sparkles,
  User,
  Pill,
  Tag,
  MapPin,
  Leaf,
  Store,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { API_CONFIG } from "@/lib/api-config";

export interface MedicineData {
  id: string | number;
  name: string;
  manufacturer: string;
  form: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  inStock?: boolean;
  prescriptionRequired?: boolean;
  image?: string;
  // Extended fields for browse page
  isGeneric?: boolean;
  hasNearbyStock?: boolean;
  nearbyStoreCount?: number;
  source?: "vendor" | "medicine" | "ai";
  genericName?: string;
}

interface MedicineCardProps {
  medicine: MedicineData;
  onAddToCart?: (medicine: MedicineData) => void;
  className?: string;
  // Quantity controls (for wishlist/cart in-page stepper)
  quantity?: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

export function MedicineCard({
  medicine,
  onAddToCart,
  className = "",
  quantity,
  onIncrement,
  onDecrement,
}: MedicineCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat whenever a new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Reset conversation when Modal closes
  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setChatHistory([]);
      setFollowUpSuggestions([]);
      setConversationId(null);
      setAiQuery("");
      setAiError(null);
    }
  };

  const discount =
    medicine.discount ||
    (medicine.originalPrice && medicine.originalPrice > medicine.price
      ? Math.round(
          ((medicine.originalPrice - medicine.price) / medicine.originalPrice) *
            100,
        )
      : 0);

  const handleAddToCart = () => {
    if (onAddToCart && medicine.inStock !== false) {
      onAddToCart(medicine);
    }
  };

  const sendQuestion = async (question: string) => {
    const q = question.trim();
    if (!q || isSearching) return;

    setAiQuery("");
    setAiError(null);
    setFollowUpSuggestions([]);
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setIsSearching(true);

    try {
      // First message: prepend medicine context so the AI has full knowledge
      const isFirstMessage = conversationId === null;
      const messageToSend = isFirstMessage
        ? `I am asking about the medicine "${medicine.name}" (Manufacturer: ${medicine.manufacturer}, Form: ${medicine.form}, Price: ₹${medicine.price}${medicine.originalPrice ? `, MRP: ₹${medicine.originalPrice}` : ""}). My question: ${q}`
        : q;

      const res = await apiClient.post<any>(
        API_CONFIG.API.CHATBOT.MESSAGE,
        {
          message: messageToSend,
          ...(conversationId ? { sessionId: conversationId } : {}),
        },
        // useAI = false (default) → goes to Node.js, which proxies to AI
      );

      const data = (res as any).data ?? (res as any);
      const answer: string =
        data?.message ?? "Sorry, I couldn't get an answer right now.";
      setConversationId(data?.sessionId ?? null);
      const suggestions: string[] = [
        ...(data?.followUpQuestions ?? []),
        ...(data?.suggestions ?? []),
      ].slice(0, 4);

      setChatHistory((prev) => [...prev, { role: "ai", text: answer }]);
      setFollowUpSuggestions(suggestions);
    } catch (err: any) {
      setAiError(
        err?.message ?? "Could not reach the AI service. Please try again.",
      );
      setChatHistory((prev) => prev.slice(0, -1));
    } finally {
      setIsSearching(false);
    }
  };

  const handleAiSearch = () => sendQuestion(aiQuery);

  return (
    <Card
      className={`group overflow-hidden shadow-xs hover:shadow-sm hover:-translate-y-0. transition-all py-0 duration-300 border border-border flex flex-col ${className}`}
    >
      <CardContent className="p-4 flex-1 flex flex-col gap-3">
        {/* Row: icon + badges */}
        <div className="flex items-start gap-1 pr-2">
          <div className="w-10 h-10 rounded-md bg-orange-50 border border-orange-10 flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5 text-orange-500" />
          </div>

          {/* Name + Manufacturer */}
          <div className="flex-1 min-w-0">
            <div className="min-h-10 flex items-center">
              <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                {medicine.name}
              </h3>
            </div>
            {medicine.genericName && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {medicine.genericName}
              </p>
            )}
            {!medicine.isGeneric && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                By{" "}
                <span className="font-semibold text-foreground/70">
                  {medicine.manufacturer}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Source + Tags: form + prescription + stock */}
        <div className="flex flex-wrap gap-1.5">
          {/* {medicine.source === "vendor" && (
            <span className="inline-flex items-center bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-medium px-2 py-0.5 rounded-full">
              Vendor
            </span>
          )}
          {medicine.source === "medicine" && (
            <span className="inline-flex items-center bg-secondary text-secondary-foreground text-[11px] font-medium px-2 py-0.5 rounded-full border">
              Medicine DB
            </span>
          )}
          {medicine.source === "ai" && (
            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border">
              Catalog
            </span>
          )}
          */}
          {medicine.form && (
            <span className="inline-flex items-center bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-medium px-2 py-0.5 rounded-full">
              {medicine.form}
            </span>
          )}
          {medicine.prescriptionRequired && (
            <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium px-2 py-0.5 rounded-full">
              <AlertCircle className="w-2.5 h-2.5" />
              Rx
            </span>
          )}
          {/* <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              medicine.inStock !== false
                ? "bg-green-50 text-green-600 border-green-100"
                : "bg-gray-100 text-gray-400 border-gray-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                medicine.inStock !== false ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            {medicine.inStock !== false ? "In Stock" : "Out of Stock"}
          </span> */}

          {medicine.hasNearbyStock && (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-[11px] gap-1">
              <MapPin className="w-2.5 h-2.5" /> Nearby
            </Badge>
          )}
          {medicine.isGeneric && (
            <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[11px] gap-1">
              <Leaf className="w-2.5 h-2.5" /> Generic
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="mt-auto pt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground tracking-tight">
              ₹{medicine.price.toFixed(2)}
            </span>
            {medicine.originalPrice &&
              medicine.originalPrice > medicine.price && (
                <span className="text-sm text-muted-foreground line-through">
                  ₹{medicine.originalPrice.toFixed(2)}
                </span>
              )}
          </div>
          {discount > 0 &&
            medicine.originalPrice &&
            medicine.originalPrice > medicine.price && (
              <p className="text-xs font-semibold text-green-600 mt-0.5">
                Save ₹{(medicine.originalPrice - medicine.price).toFixed(2)}
              </p>
            )}
          {medicine.hasNearbyStock &&
            medicine.nearbyStoreCount !== undefined && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                <Store className="w-3 h-3" />
                {medicine.nearbyStoreCount} store
                {medicine.nearbyStoreCount !== 1 ? "s" : ""} nearby
              </p>
            )}
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0">
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 cursor-pointer w-10 h-10 rounded-md border-2 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-500 transition-all"
            onClick={() => setIsModalOpen(true)}
            title="View Details"
          >
            <Info className="w-4 h-4" />
          </Button>
          {quantity !== undefined && quantity > 0 ? (
            <div className="flex items-center justify-between flex-1 bg-orange-50 border border-orange-200 rounded-md px-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-orange-100"
                onClick={onDecrement}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <span className="font-semibold text-sm w-6 text-center">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-orange-100"
                onClick={onIncrement}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              className={`flex-1 cursor-pointer font-semibold text-sm h-10 rounded-md transition-all ${
                medicine.inStock === false
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow"
              }`}
              onClick={handleAddToCart}
              disabled={medicine.inStock === false}
            >
              {medicine.inStock === false ? (
                "Out of Stock"
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  Add To Cart
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>

      {/* Medicine Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Modal accent header */}
          <div className="" />
          <div className="px-6">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-md bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Pill className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground leading-snug pr-6">
                    {medicine.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    By {medicine.manufacturer} &middot; {medicine.form}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-6 px-6 pb-2">
            {/* Medicine Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Manufacturer
                  </label>
                  <p className="text-base font-medium text-foreground mt-1">
                    {medicine.manufacturer}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Form & Packaging
                  </label>
                  <p className="text-base font-medium text-foreground mt-1">
                    {medicine.form}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Stock Status
                  </label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        medicine.inStock !== false ? "success" : "destructive"
                      }
                    >
                      {medicine.inStock !== false ? "In Stock" : "Out of Stock"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Price
                  </label>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      ₹{medicine.price.toFixed(2)}
                    </span>
                    {medicine.originalPrice &&
                      medicine.originalPrice > medicine.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{medicine.originalPrice.toFixed(2)}
                        </span>
                      )}
                  </div>
                  {discount > 0 && (
                    <Badge
                      variant="destructive"
                      className="mt-2 bg-red-50 text-red-600"
                    >
                      {discount}% OFF
                    </Badge>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Prescription
                  </label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        medicine.prescriptionRequired ? "secondary" : "outline"
                      }
                      className={
                        medicine.prescriptionRequired
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : ""
                      }
                    >
                      {medicine.prescriptionRequired ? (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Required
                        </>
                      ) : (
                        "Not Required"
                      )}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Product ID
                  </label>
                  <p className="text-base font-medium text-foreground mt-1">
                    #{medicine.id}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Chat Section */}
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  AI Assistant
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Ask anything about {medicine.name} — side effects, dosage,
                interactions, and more.
              </p>

              {/* Chat history */}
              {chatHistory.length > 0 && (
                <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2.5 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "ai" && (
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                      <div
                        className={`rounded-md px-3.5 py-2.5 text-sm max-w-[82%] whitespace-pre-wrap leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-accent text-foreground rounded-tl-sm border border-border"
                        }`}
                      >
                        {msg.text}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Typing indicator */}
                  {isSearching && (
                    <div className="flex gap-2.5 justify-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="bg-accent border border-border rounded-md rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                        <span
                          className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Follow-up suggestions */}
              {followUpSuggestions.length > 0 && !isSearching && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {followUpSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendQuestion(s)}
                      className="text-xs border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 rounded-full px-3 py-1 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Error */}
              {aiError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-sm mb-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {aiError}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., What are the side effects? How should I take this?"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleAiSearch()
                  }
                  className="flex-1"
                  disabled={isSearching}
                />
                <Button
                  onClick={handleAiSearch}
                  disabled={isSearching || !aiQuery.trim()}
                  className="bg-primary hover:bg-primary/90 shrink-0"
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 px-6 pb-5 pt-2">
            <Button
              variant="outline"
              onClick={() => handleModalChange(false)}
              className="flex-1 rounded-md"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                handleAddToCart();
                handleModalChange(false);
              }}
              disabled={medicine.inStock === false}
              className="flex-1 rounded-md bg-orange-500 hover:bg-orange-600 text-white"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add To Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Grid wrapper component for medicine cards
interface MedicineGridProps {
  medicines: MedicineData[];
  onAddToCart?: (medicine: MedicineData) => void;
  getQuantity?: (medicine: MedicineData) => number;
  onIncrement?: (medicine: MedicineData) => void;
  onDecrement?: (medicine: MedicineData) => void;
  className?: string;
}

export function MedicineGrid({
  medicines,
  onAddToCart,
  getQuantity,
  onIncrement,
  onDecrement,
  className = "",
}: MedicineGridProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}
    >
      {medicines.map((medicine) => (
        <MedicineCard
          key={medicine.id}
          medicine={medicine}
          onAddToCart={onAddToCart}
          quantity={getQuantity?.(medicine)}
          onIncrement={onIncrement ? () => onIncrement(medicine) : undefined}
          onDecrement={onDecrement ? () => onDecrement(medicine) : undefined}
        />
      ))}
    </div>
  );
}
