"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Bell,
  Shield,
  Mail,
  Database,
  Server,
  Globe,
  CheckCircle,
} from "lucide-react";

export default function SettingsPage() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Platform Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure system-wide settings and preferences
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <Button size="sm" className="h-8 text-xs">
              Save
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancel" : "Edit Settings"}
          </Button>
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-white rounded-lg p-4 border border-border card-shadow">
        <h3 className="text-sm font-semibold mb-3">Platform Information</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { label: "Platform Name", value: "QuickMedi" },
            { label: "Support Email", value: "support@quickmedi.com" },
            { label: "Support Phone", value: "+91 1800-123-4567" },
            { label: "Platform Version", value: "v2.1.0" },
            { label: "Default Language", value: "English (en)" },
            { label: "Timezone", value: "IST (UTC+5:30)" },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                {f.label}
              </label>
              <Input
                defaultValue={f.value}
                disabled={!isEditing}
                className={`h-9 text-sm ${!isEditing ? "bg-muted" : ""}`}
              />
            </div>
          ))}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium mb-1 text-muted-foreground">
              Company Address
            </label>
            <Input
              defaultValue="123 Health Street, Mumbai, Maharashtra - 400001"
              disabled={!isEditing}
              className={`h-9 text-sm ${!isEditing ? "bg-muted" : ""}`}
            />
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Notifications */}
        <div className="bg-white rounded-lg p-4 border border-border card-shadow">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Notifications</h3>
              <p className="text-xs text-muted-foreground">
                Alerts and system notifications
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "Emergency alert notifications", checked: true },
              { label: "New vendor applications", checked: true },
              { label: "System maintenance alerts", checked: true },
              { label: "Daily summary reports", checked: false },
              { label: "Payment gateway alerts", checked: true },
            ].map((item) => (
              <label
                key={item.label}
                className="flex items-center justify-between py-2.5 cursor-pointer"
              >
                <span className="text-xs">{item.label}</span>
                <input
                  type="checkbox"
                  defaultChecked={item.checked}
                  className="w-4 h-4"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg p-4 border border-border card-shadow">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Security</h3>
              <p className="text-xs text-muted-foreground">
                Authentication & access control
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "Two-factor authentication", checked: true },
              { label: "Password expiry (90 days)", checked: true },
              { label: "Session timeout (30 min)", checked: true },
              { label: "IP whitelist enforcement", checked: false },
              { label: "Audit logging", checked: true },
            ].map((item) => (
              <label
                key={item.label}
                className="flex items-center justify-between py-2.5 cursor-pointer"
              >
                <span className="text-xs">{item.label}</span>
                <input
                  type="checkbox"
                  defaultChecked={item.checked}
                  className="w-4 h-4"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-lg p-4 border border-border card-shadow">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Email / SMS Config</h3>
              <p className="text-xs text-muted-foreground">
                SMTP and notification delivery
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {[
              { key: "SMTP Server", val: "smtp.quickmedi.com" },
              { key: "Port", val: "587" },
              { key: "Encryption", val: "TLS" },
              { key: "SMS Provider", val: "Twilio (active)" },
              { key: "Status", val: "Connected" },
            ].map((item) => (
              <div key={item.key} className="flex justify-between py-2">
                <span className="text-xs text-muted-foreground">
                  {item.key}
                </span>
                <span
                  className={`text-xs font-medium ${item.val === "Connected" ? "text-green-600" : ""}`}
                >
                  {item.val}
                </span>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-3 h-8 text-xs">
            Configure Email / SMS
          </Button>
        </div>

        {/* Database */}
        <div className="bg-white rounded-lg p-4 border border-border card-shadow">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Database className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Database & Backup</h3>
              <p className="text-xs text-muted-foreground">
                MongoDB Atlas · auto-backup enabled
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {[
              { key: "Last Backup", val: "2 hours ago" },
              { key: "Backup Frequency", val: "Every 6 hours" },
              { key: "Retention", val: "30 days" },
              { key: "DB Size", val: "14.2 GB" },
              { key: "Status", val: "Healthy" },
            ].map((item) => (
              <div key={item.key} className="flex justify-between py-2">
                <span className="text-xs text-muted-foreground">
                  {item.key}
                </span>
                <span
                  className={`text-xs font-medium ${item.val === "Healthy" ? "text-green-600" : ""}`}
                >
                  {item.val}
                </span>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-3 h-8 text-xs">
            Trigger Backup Now
          </Button>
        </div>
      </div>

      {/* Subscription Plan Config */}
      <div className="bg-white rounded-lg p-4 border border-border card-shadow">
        <h3 className="text-sm font-semibold mb-3">
          Subscription Plan Configuration
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              plan: "Free",
              price: "₹0",
              scans: "3 scans/day",
              features: [
                "Basic medicine search",
                "Interaction checker (3/day)",
                "Prescription scan (3/day)",
              ],
            },
            {
              plan: "Pro",
              price: "₹499/mo",
              scans: "Unlimited",
              features: [
                "Unlimited scans",
                "AI chatbot",
                "Savings tracker",
                "Emergency alerts",
                "Order history",
              ],
            },
          ].map((p) => (
            <div
              key={p.plan}
              className={`rounded-lg p-3 border ${p.plan === "Pro" ? "border-primary/30 bg-orange-50/30" : "border-border"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{p.plan} Plan</span>
                <span className="text-sm font-bold text-primary">
                  {p.price}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{p.scans}</p>
              <div className="space-y-1">
                {p.features.map((f) => (
                  <div key={f} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-xs">{f}</span>
                  </div>
                ))}
              </div>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 h-7 text-xs"
                >
                  Edit Plan
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
