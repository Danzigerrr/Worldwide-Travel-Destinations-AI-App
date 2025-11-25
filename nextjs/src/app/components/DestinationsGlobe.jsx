"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GLOBE_TEXTURE = "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg";
const GLOBE_BUMP = "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";

const markerSvg = `<svg viewBox="-4 0 36 36">
  <path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path>
  <circle fill="black" cx="14" cy="14" r="7"></circle>
</svg>`;

export default function DestinationsGlobe({ destinations = [], height = 360 }) {
    const containerRef = useRef(null);
    const globeRef = useRef(null);
    const [popup, setPopup] = useState(null);
    const router = useRouter();

    const validDestinations = useMemo(
        () =>
            destinations
                .map((dest) => ({
                    ...dest,
                    lat: parseFloat(dest.latitude),
                    lng: parseFloat(dest.longitude),
                }))
                .filter((dest) => Number.isFinite(dest.lat) && Number.isFinite(dest.lng)),
        [destinations]
    );

    const markersData = useMemo(
        () =>
            validDestinations.map((dest) => ({
                id: dest.id,
                lat: dest.lat,
                lng: dest.lng,
                name: `${dest.city}, ${dest.country}`,
                description: `${dest.region || "Unknown region"} · ${dest.budget_level || "N/A"}`,
                destination: dest,
            })),
        [validDestinations]
    );

    useEffect(() => {
        if (!containerRef.current) return;

        let Globe;
        let globeInstance;
        let resizeHandler;

        const initGlobe = async () => {
            try {
                const globeModule = await import("globe.gl");
                Globe = globeModule.default || globeModule.Globe;

                if (!Globe) {
                    console.error("Globe.gl not found");
                    return;
                }

                // Get container dimensions
                const container = containerRef.current;
                const containerWidth = container.offsetWidth || container.clientWidth;
                const containerHeight = container.offsetHeight || container.clientHeight;

                globeInstance = new Globe(container)
                    .width(containerWidth)
                    .height(containerHeight)
                    .globeImageUrl(GLOBE_TEXTURE)
                    .bumpImageUrl(GLOBE_BUMP)
                    .globeOffset([0, 0])
                    .htmlElementsData(markersData)
                    .htmlElement((d) => {
                        const el = document.createElement("div");
                        el.innerHTML = markerSvg;
                        el.style.color = "#ffcc33";
                        el.style.width = "18px";
                        el.style.height = "18px";
                        el.style.pointerEvents = "auto";
                        el.style.cursor = "pointer";
                        el.onclick = (ev) => {
                            ev.stopPropagation();
                            setPopup({
                                markerEl: el,
                                destination: d.destination,
                                x: null,
                                y: null,
                            });
                            const currentView = globeInstance.pointOfView();
                            const desiredAltitude =
                                currentView && typeof currentView.altitude === "number" && currentView.altitude < 0.4
                                    ? currentView.altitude
                                    : 0.4;
                            globeInstance.pointOfView(
                                { lat: d.lat, lng: d.lng, altitude: desiredAltitude },
                                200
                            );
                        };
                        return el;
                    })
                    .htmlElementVisibilityModifier((el, isVisible) => {
                        el.style.opacity = isVisible ? 1 : 0;
                    });

                globeRef.current = globeInstance;

                // Set initial view - centered on Europe (more to the right) with better zoom
                if (!validDestinations.length) {
                    // Default view: Europe centered, zoomed out to see full globe
                    globeInstance.pointOfView({ lat: 45, lng: 15, altitude: 2.2 }, 500);
                } else if (validDestinations.length === 1) {
                    const only = validDestinations[0];
                    globeInstance.pointOfView({ lat: only.lat, lng: only.lng, altitude: 1.8 }, 500);
                } else {
                    const avgLat =
                        validDestinations.reduce((sum, dest) => sum + dest.lat, 0) / validDestinations.length;
                    const avgLng =
                        validDestinations.reduce((sum, dest) => sum + dest.lng, 0) / validDestinations.length;
                    // Use higher altitude to show more of the globe, centered on average location
                    globeInstance.pointOfView({ lat: avgLat, lng: avgLng, altitude: 1.5 }, 500);
                }

                // Handle window resize
                resizeHandler = () => {
                    if (globeInstance && container) {
                        const newWidth = container.offsetWidth || container.clientWidth;
                        const newHeight = container.offsetHeight || container.clientHeight;
                        globeInstance.width(newWidth).height(newHeight);
                    }
                };

                window.addEventListener("resize", resizeHandler);
            } catch (error) {
                console.error("Error loading globe.gl:", error);
            }
        };

        initGlobe();

        return () => {
            if (resizeHandler) {
                window.removeEventListener("resize", resizeHandler);
            }
            if (globeInstance) {
                globeInstance._destructor?.();
            }
        };
    }, [markersData, validDestinations]);

    useEffect(() => {
        const handleClickOutside = (ev) => {
            if (popup && !ev.target.closest(".globe-popup")) {
                setPopup(null);
            }
        };
        document.addEventListener("click", handleClickOutside, true);
        return () => document.removeEventListener("click", handleClickOutside, true);
    }, [popup]);

    const computePopupPosition = (markerEl) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const markerRect = markerEl?.getBoundingClientRect();
        if (!containerRect || !markerRect) return null;
        return {
            x: markerRect.left - containerRect.left + markerRect.width / 2,
            y: markerRect.top - containerRect.top - markerRect.height / 2,
        };
    };

    const adjustZoom = (direction) => {
        if (!globeRef.current) return;
        const currentView = globeRef.current.pointOfView();
        const currentAltitude =
            currentView && typeof currentView.altitude === "number" ? currentView.altitude : 1;
        const factor = direction === "in" ? 0.85 : 1.15;
        const minAltitude = 0.2;
        const maxAltitude = 3.5;
        const nextAltitude = Math.min(
            maxAltitude,
            Math.max(minAltitude, currentAltitude * factor)
        );

        globeRef.current.pointOfView(
            {
                lat: currentView?.lat ?? 0,
                lng: currentView?.lng ?? 0,
                altitude: nextAltitude,
            },
            300
        );
    };

    useEffect(() => {
        if (!popup?.markerEl) return;

        const updatePosition = () => {
            const coords = computePopupPosition(popup.markerEl);
            if (!coords) return;
            setPopup((prev) => {
                if (!prev) return prev;
                if (prev.x === coords.x && prev.y === coords.y) return prev;
                return { ...prev, ...coords };
            });
        };

        updatePosition();

        const controls = globeRef.current?.controls?.();
        controls?.addEventListener("change", updatePosition);
        window.addEventListener("resize", updatePosition);

        return () => {
            controls?.removeEventListener("change", updatePosition);
            window.removeEventListener("resize", updatePosition);
        };
    }, [popup?.markerEl]);

    return (
        <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: "100%", height }}>
            <div
                ref={containerRef}
                className="rounded-4 overflow-hidden"
                style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#061024",
                    position: "relative",
                }}
            />

            <div
                className="position-absolute top-0 end-0 m-3 d-flex flex-column gap-2"
                style={{ zIndex: 6000 }}
            >
                <button
                    type="button"
                    className="btn btn-light btn-sm shadow-sm"
                    onClick={() => adjustZoom("in")}
                >
                    +
                </button>
                <button
                    type="button"
                    className="btn btn-light btn-sm shadow-sm"
                    onClick={() => adjustZoom("out")}
                >
                    −
                </button>
            </div>

            {popup?.destination && (
                <div
                    className="globe-popup position-absolute bg-white rounded-3 shadow p-3"
                    style={{
                        minWidth: "200px",
                        zIndex: 5000,
                        left: `${popup.x ?? 0}px`,
                        top: `${popup.y ?? 0}px`,
                        transform: "translate(-50%, calc(-100% - 8px))",
                        pointerEvents: "auto",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
                    }}
                    onClick={(ev) => ev.stopPropagation()}
                >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <p className="fw-semibold mb-0">
                                {popup.destination.city}, {popup.destination.country}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={() => setPopup(null)}
                        />
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary w-100 btn-sm mt-3"
                        onClick={(ev) => {
                            ev.stopPropagation();
                            if (popup.destination?.id) {
                                router.push(`/destinations/${popup.destination.id}`);
                            }
                        }}
                    >
                        View Details
                    </button>
                </div>
            )}
        </div>
    );
}

