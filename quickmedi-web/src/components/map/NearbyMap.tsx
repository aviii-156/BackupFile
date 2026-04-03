"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix webpack mangled icon paths
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

const storeIcon = (isOpen: boolean, isSelected: boolean) =>
  L.divIcon({
    html: `
      <div style="
        width: ${isSelected ? "40px" : "32px"};
        height: ${isSelected ? "40px" : "32px"};
        background: ${isOpen ? (isSelected ? "#059669" : "#10b981") : "#9ca3af"};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,${isSelected ? "0.5" : "0.3"});
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: ${isSelected ? "17px" : "13px"};">🏪</span>
      </div>`,
    className: "",
    iconSize: [isSelected ? 40 : 32, isSelected ? 40 : 32],
    iconAnchor: [isSelected ? 20 : 16, isSelected ? 40 : 32],
    popupAnchor: [0, -36],
  });

const userIcon = () =>
  L.divIcon({
    html: `<div style="
    width:18px; height:18px;
    background:#3b82f6;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 5px rgba(59,130,246,0.25);
  "></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 13, { duration: 1.5 });
  }, [lat, lng, map]);
  return null;
}

export interface MapStore {
  _id: string;
  storeName: string;
  phone: string;
  address: {
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
  };
  location: { coordinates: [number, number] };
  distance: number;
  isOpen: boolean;
  deliveryAvailable: boolean;
  averageRating?: number;
}

interface NearbyMapProps {
  userLat: number;
  userLng: number;
  stores: MapStore[];
  selectedStore: string | null;
  onSelectStore: (id: string) => void;
  radiusKm: number;
  mapLayer: "road" | "satellite";
}

export default function NearbyMap({
  userLat,
  userLng,
  stores,
  selectedStore,
  onSelectStore,
  radiusKm,
  mapLayer,
}: NearbyMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fixLeafletIcons();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const tiles =
    mapLayer === "satellite"
      ? {
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          attribution: "© Esri World Imagery",
        }
      : {
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        };

  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={13}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
    >
      <TileLayer url={tiles.url} attribution={tiles.attribution} />
      <FlyTo lat={userLat} lng={userLng} />

      {/* Radius circle */}
      <Circle
        center={[userLat, userLng]}
        radius={radiusKm * 1000}
        pathOptions={{
          color: "#10b981",
          fillColor: "#10b981",
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: "6 4",
        }}
      />

      {/* User marker */}
      <Marker position={[userLat, userLng]} icon={userIcon()}>
        <Popup>
          <strong style={{ fontSize: 13 }}>📍 Your Location</strong>
        </Popup>
      </Marker>

      {/* Store markers */}
      {stores.map((store) => {
        const [lng, lat] = store.location.coordinates;
        const isSelected = selectedStore === store._id;
        return (
          <Marker
            key={store._id}
            position={[lat, lng]}
            icon={storeIcon(store.isOpen, isSelected)}
            eventHandlers={{ click: () => onSelectStore(store._id) }}
          >
            <Popup>
              <div style={{ minWidth: 190, fontFamily: "inherit" }}>
                <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>
                  {store.storeName}
                </p>
                <p
                  style={{ fontSize: 12, color: "#6b7280", margin: "0 0 2px" }}
                >
                  {store.address.addressLine1}
                </p>
                <p
                  style={{ fontSize: 12, color: "#6b7280", margin: "0 0 6px" }}
                >
                  {store.address.city}, {store.address.state}{" "}
                  {store.address.pincode}
                </p>
                <p style={{ fontSize: 12, margin: "0 0 6px" }}>{store.phone}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: store.isOpen ? "#d1fae5" : "#f3f4f6",
                      color: store.isOpen ? "#065f46" : "#6b7280",
                      padding: "2px 8px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {store.isOpen ? "Open Now" : "Closed"}
                  </span>
                  <span style={{ fontSize: 12, color: "#374151" }}>
                    📍 {store.distance} km
                  </span>
                  {store.deliveryAvailable && (
                    <span
                      style={{
                        background: "#dbeafe",
                        color: "#1e40af",
                        padding: "2px 8px",
                        borderRadius: 9999,
                        fontSize: 11,
                      }}
                    >
                      Delivery
                    </span>
                  )}
                  {store.averageRating ? (
                    <span style={{ fontSize: 12, color: "#f59e0b" }}>
                      ⭐ {store.averageRating.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
