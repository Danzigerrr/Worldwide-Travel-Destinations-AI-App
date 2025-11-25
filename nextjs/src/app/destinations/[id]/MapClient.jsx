"use client";

import { useEffect, useRef } from "react";

export default function MapClient({ position, destination, height = 400 }) {
    const mapNodeRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        let mapInstance = mapInstanceRef.current;
        let isMounted = true;

        if (!position || !mapNodeRef.current) return undefined;

        (async () => {
            const leafletModule = await import("leaflet");
            await import("leaflet-defaulticon-compatibility");
            if (!isMounted) return;

            const L = leafletModule.default || leafletModule;

            mapInstance = L.map(mapNodeRef.current).setView(position, 11);
            mapInstanceRef.current = mapInstance;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }).addTo(mapInstance);

            L.marker(position)
                .addTo(mapInstance)
                .bindPopup(
                    `<strong>${destination.city}, ${destination.country}</strong><br/>` +
                    `Region: ${destination.region}<br/>` 
                    // `Lat/Lng: ${destination.latitude}, ${destination.longitude}`
                );
        })();

        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [position, destination]);

    if (!position) return null;

    return (
        <div
            ref={mapNodeRef}
            style={{
                width: "100%",
                height: height,
                minHeight: height,
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                boxShadow: "inset 0 1px 4px rgba(0,0,0,0.08)",
            }}
        />
    );
}
