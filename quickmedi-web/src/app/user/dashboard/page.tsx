"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  FileText,
  Heart,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Pill,
  Plus,
  Scan,
  Search,
  Shield,
  ShoppingBag,
  Star,
  TrendingUp,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { patientService } from "@/services/patient.service";
import { reminderService } from "@/services/reminderService";
import { getDoseWindowState, isCurrentWindowTaken } from "@/utils/reminderHelpers";

type MedicineStatus = "taken" | "upcoming" | "pending" | "missed";

type TodayMedicine = {
  reminderId: string;
  time: string;
  medicine: string;
  dosage: string;
  status: MedicineStatus;
  instructions: string;
};

export default function UserDashboard() {
  const [medicineSchedule, setMedicineSchedule] = useState<TodayMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Tick every 30 s to keep time-window badges current
  const [now, setNow] = useState(() => new Date());
  // Track which reminder IDs have an in-flight markTaken request
  // useRef for the guard (always current — avoids stale-closure double-click)
  // useState only drives the spinner visual
  const markingRef = useRef<Set<string>>(new Set());
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [userData, setUserData] = useState({
    name: "",
    memberSince: "",
    subscription: "Standard",
    avatar: "",
    healthScore: 0,
    bloodGroup: "",
    age: 0,
    allergies: [] as string[],
    chronicConditions: [] as string[],
  });
  const [stats, setStats] = useState([
    { label: "Active Prescriptions", value: "—", change: "", trend: "up" as const, icon: FileText, color: "blue" },
    { label: "Medicines Taken", value: "—", change: "", trend: "up" as const, icon: Pill, color: "green" },
    { label: "Total Savings", value: "—", change: "", trend: "up" as const, icon: Wallet, color: "purple" },
    { label: "Health Score", value: "—", change: "", trend: "up" as const, icon: Heart, color: "red" },
  ]);
  const [recentOrders, setRecentOrders] = useState<Array<{
    id: string; date: string; items: number; total: number; status: string; statusText: string;    firstName: string; extraItems: number;  }>>([]);
  const [nearbyPharmacies, setNearbyPharmacies] = useState<Array<{
    id: string; name: string; distance: string; rating: number; open: boolean; deliveryTime: string;
  }>>([]);

  // Tick every 30 s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await patientService.getDashboard();
        if (res.success && res.data) {
          const { user, stats: apiStats, recentOrders: orders, upcomingReminders, nearbyPharmacies: pharmacies } = res.data as any;
          setUserData({
            name: user.name || "",
            memberSince: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "",
            subscription: "Standard",
            avatar: (user.name || "U").slice(0, 2).toUpperCase(),
            healthScore: 85,
            bloodGroup: user.bloodGroup || "",
            age: user.dateOfBirth ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0,
            allergies: user.allergies || [],
            chronicConditions: user.chronicConditions || [],
          });
          setStats([
            { label: "Active Prescriptions", value: String(apiStats?.prescriptions ?? 0), change: "Total uploaded", trend: "up", icon: FileText, color: "blue" },
            { label: "Active Reminders", value: String(apiStats?.activeReminders ?? 0), change: "Scheduled today", trend: "up", icon: Pill, color: "green" },
            { label: "Total Savings", value: `₹${apiStats?.savedAmount ?? 0}`, change: "On generics", trend: "up", icon: Wallet, color: "purple" },
            { label: "Total Orders", value: String(apiStats?.totalOrders ?? 0), change: "All time", trend: "up", icon: Heart, color: "red" },
          ]);
          setRecentOrders(
            (orders || []).slice(0, 3).map((o: any) => ({
              id: o._id || o.id || "—",
              date: o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—",
              items: o.items?.length ?? 0,
              total: o.totalAmount ?? 0,
              status: o.status || "processing",
              statusText: (o.status || "processing").charAt(0).toUpperCase() + (o.status || "processing").slice(1),
              firstName: o.items?.[0]?.medicineName || o.items?.[0]?.genericName || "Order",
              extraItems: Math.max(0, (o.items?.length ?? 0) - 1),
            }))
          );
          setMedicineSchedule(
            (upcomingReminders || []).slice(0, 4).map((r: any) => {
              const times: string[] = Array.isArray(r.times) ? r.times : (r.time ? [r.time] : []);
              const takenThisWindow = isCurrentWindowTaken(r.lastTakenAt, times);
              return {
                reminderId: r._id || r.id || "",
                time: times[0] || "",
                medicine: r.medicineName || r.medicine || "",
                dosage: r.dosage || "",
                status: takenThisWindow || r.status === "taken" ? "taken" : r.status === "missed" ? "pending" : "upcoming",
                instructions: r.instruction || r.instructions || r.notes || "",
              };
            })
          );
          if (Array.isArray(pharmacies) && pharmacies.length > 0) {
            setNearbyPharmacies(pharmacies);
          }
        }
      } catch {
        // Keep defaults on error
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  console.log("Dashboard Data:", { userData, stats, recentOrders, medicineSchedule, nearbyPharmacies });

  // Function to mark medicine as taken — time-window guard + optimistic update + real API
  const handleMarkAsTaken = useCallback(async (reminderId: string) => {
    if (!reminderId || markingRef.current.has(reminderId)) return;
    markingRef.current.add(reminderId);
    setMarkingIds(new Set(markingRef.current));
    // Optimistic update
    setMedicineSchedule((prev) =>
      prev.map((item) =>
        item.reminderId === reminderId ? { ...item, status: "taken" as MedicineStatus } : item
      )
    );
    try {
      await reminderService.markDoseTaken(reminderId);
    } catch {
      // Revert on failure
      setMedicineSchedule((prev) =>
        prev.map((item) =>
          item.reminderId === reminderId ? { ...item, status: "upcoming" as MedicineStatus } : item
        )
      );
    } finally {
      markingRef.current.delete(reminderId);
      setMarkingIds(new Set(markingRef.current));
    }
  }, []);

  // Quick actions
  const quickActions = [
    {
      title: "Scan Prescription",
      description: "Upload & get medicines",
      icon: Scan,
      color: "bg-blue-500",
      href: "/user/scan",
    },
    {
      title: "Find Medicines",
      description: "Search our catalog",
      icon: Search,
      color: "bg-green-500",
      href: "/user/medicines",
    },
    {
      title: "Check Interactions",
      description: "Verify drug safety",
      icon: Shield,
      color: "bg-purple-500",
      href: "/user/interaction-checker",
    },
    {
      title: "Nearby Stores",
      description: "Find pharmacies",
      icon: MapPin,
      color: "bg-orange-500",
      href: "/user/nearby-stores",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="px-4 py-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {stat.value}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    stat.color === "blue"
                      ? "bg-blue-100 text-blue-600"
                      : stat.color === "green"
                        ? "bg-green-100 text-green-600"
                        : stat.color === "purple"
                          ? "bg-purple-100 text-purple-600"
                          : "bg-red-100 text-red-600"
                  }`}
                >
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="px-0.5 mb-2">
          <h2 className="text-xl font-bold text-foreground">Quick Actions</h2>
          <p className="text-sm text-muted-foreground">
            Common tasks and shortcuts
          </p>
        </div>
        <div className="px-0 py-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card className="group cursor-pointer rounded-lg border border-border p-4 gap-1 hover:border-primary hover:shadow-md transition-all">
                  <div
                    className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                  >
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">
                    {action.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Medicine Schedule */}
          <Card className="shadow-sm rounded-md">
            <CardHeader className="">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today's Schedule</CardTitle>
                  <CardDescription>
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                </div>
                <Link href="/user/reminders">
                  <Button variant="ghost" size="sm" className="text-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Remainder
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {medicineSchedule.map((item) => {
                // Compute the effective window state for this dose slot
                const windowState =
                  item.status === "taken"
                    ? ("taken" as const)
                    : getDoseWindowState(item.time, now);

                return (
                <div
                  key={item.reminderId}
                  className="flex items-center gap-4 p-1 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div
                    className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 ${
                      windowState === "taken"
                        ? "bg-green-100 text-green-600"
                        : windowState === "active"
                          ? "bg-blue-100 text-blue-600"
                          : windowState === "expired"
                            ? "bg-red-50 text-red-400"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Clock className="w-4 h-4 mb-1" />
                    <span className="text-xs font-medium">
                      {item.time.split(" ")[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {item.medicine}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.dosage} • {item.instructions}
                    </p>
                  </div>
                  {windowState === "taken" ? (
                    <Badge variant="success" className="shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Taken
                    </Badge>
                  ) : windowState === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-9 px-3 border-2 border-blue-500 hover:bg-blue-50 hover:border-blue-600 transition-all"
                      disabled={markingIds.has(item.reminderId)}
                      onClick={() => handleMarkAsTaken(item.reminderId)}
                    >
                      <div className="flex items-center gap-2">
                        {markingIds.has(item.reminderId) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : (
                          <div className="w-4 h-4 rounded border-2 border-blue-500 bg-white flex items-center justify-center" />
                        )}
                        <span className="text-sm font-medium text-blue-600">Mark as Taken</span>
                      </div>
                    </Button>
                  ) : windowState === "expired" ? (
                    <Badge variant="secondary" className="shrink-0 text-red-500 border-red-200">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Missed
                    </Badge>
                  ) : (
                    /* too_early */
                    <Badge variant="secondary" className="shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      Upcoming
                    </Badge>
                  )}
                </div>
                );
              })}
            </CardContent>
            <CardFooter className="pt-0">
              <Link href="/user/reminders" className="w-full">
                <Button variant="ghost" className="w-full">
                  View All Reminders
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Your order history</CardDescription>
                </div>
                <Link href="/user/history">
                  <Button variant="ghost" size="sm">
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {order.firstName}{order.extraItems > 0 ? ` +${order.extraItems} more` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.date} • {order.items} {order.items === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">₹{order.total}</p>
                    <Badge variant="success" className="mt-1">
                      {order.statusText}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Health Profile Card */}
          <Card className="bg-primary border-0 text-primary-foreground">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-white">Health Profile</CardTitle>
                  <CardDescription className="text-white/80">
                    Manage your health info
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Blood Group</span>
                <span className="font-semibold">{userData.bloodGroup}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Age</span>
                <span className="font-semibold">{userData.age} years</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Health Score</span>
                <span className="font-semibold">
                  {userData.healthScore}/100
                </span>
              </div>
              <div className="pt-3 border-t border-white/20">
                <p className="text-xs text-white/80 mb-2">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {userData.allergies.map((allergy, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-white/20 text-white border-0 hover:bg-white/30"
                    >
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/user/profile" className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                >
                  Update Profile
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Nearby Pharmacies */}
          <Card className="border shadow-sm px-0 rounded-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Nearby Pharmacies
              </CardTitle>
              <CardDescription className="font-medium">Based on your location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {nearbyPharmacies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add a saved address to see nearby pharmacies.
                </p>
              ) : nearbyPharmacies.map((pharmacy, index) => (
                <Link
                  key={index}
                  href={`/user/pharmacy/${pharmacy.id}`}
                  className="block relative overflow-hidden p-4 rounded-md border border-border hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  {/* Background Image */}
                  <div 
                    className="absolute inset-0 z-0 opacity-100 transition-opacity"
                    style={{
                      backgroundImage: 'url(https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600&auto=format&fit=crop&q=80)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 to-black/30" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-base mb-1">
                          {pharmacy.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-white/80">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="font-medium">{pharmacy.distance}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-medium">{pharmacy.deliveryTime}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-100 px-2.5 py-1 rounded-full border border-yellow-300">
                        <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                        <span className="text-xs font-bold text-foreground">
                          {pharmacy.rating}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        {pharmacy.open ? (
                          <Badge variant="success" className="text-xs font-semibold px-2.5 py-0.5">
                            Open Now
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
                            Closed
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          size="icon"
                          className="h-8 w-8 bg-primary hover:bg-primary/90 text-white"
                          title="Get Direction"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Get directions to", pharmacy.name);
                          }}
                        >
                          <Compass className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-white/40 hover:bg-white/10 hover:border-white text-white"
                          title="Contact"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Call", pharmacy.name);
                          }}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
            <CardFooter className="pt-0">
              <Link href="/user/nearby-stores" className="w-full">
                <Button variant="outline" className="w-full hover:bg-primary/5 border-primary/30 hover:border-primary font-semibold">
                  View All Stores
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
