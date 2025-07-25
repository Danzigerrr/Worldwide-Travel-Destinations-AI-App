"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
);

export default function Map({ destinations }) {
    const defaultPosition = [51.505, -0.09];
    const [bounds, setBounds] = useState(null);

    const markers = useMemo(() => {
        if (!destinations || destinations.length === 0) return null;
        return destinations.map((d) => {
            const lat = parseFloat(d.latitude);
            const lng = parseFloat(d.longitude);
            return !isNaN(lat) && !isNaN(lng) ? (
                <Marker key={d.id} position={[lat, lng]}>
                    <Popup>
                        <strong>{d.city}, {d.country}</strong><br />
                        Region: {d.region}<br />
                        <button
                            onClick={() => window.location.href = `/destinations/${d.id}`}
                        >
                            View Details
                        </button>
                    </Popup>
                </Marker>
            ) : null;
        });
    }, [destinations]);

    useEffect(() => {
        if (destinations?.length) {
            const coords = destinations
                .map(d => [parseFloat(d.latitude), parseFloat(d.longitude)])
                .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
            setBounds(coords);
        }
    }, [destinations]);

    return (
        <MapContainer
            center={defaultPosition}
            zoom={2}
            scrollWheelZoom={true}
            style={{ height: "80vh", width: "100%" }}
            bounds={bounds}
            boundsOptions={{ padding: [50, 50] }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers}
        </MapContainer>
    );
}
