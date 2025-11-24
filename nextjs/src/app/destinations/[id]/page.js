"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import dynamic from "next/dynamic";

// Usunieto importy Leaflet z poziomu modułu (powodują SSR error).
// Zamiast tego dynamicznie ładujemy klientowy komponent mapy:
const MapClient = dynamic(() => import("./MapClient"), { ssr: false });

export default function DestinationDetailsPage() {
    const { id: destinationId } = useParams();
    const [destination, setDestination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const mapPosition = useMemo(() => {
        if (!destination) return null;
        const lat = parseFloat(destination.latitude);
        const lng = parseFloat(destination.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
    }, [destination]);

    useEffect(() => {
        if (!destinationId) return;

        (async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
                const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
                const res = await axios.get(
                    `${backendApiUrl}/destinations/${destinationId}`,
                    {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    }
                );
                setDestination(res.data);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        })();
    }, [destinationId]);

    if (loading) return <p>Loading...</p>;
    if (error) return <p className="text-red-600">Error: {error.message}</p>;
    if (!destination) return <p>Destination not found.</p>;

    const scoreKeys = ["culture", "adventure", "nature", "beaches", "nightlife", "cuisine", "wellness", "urban", "seclusion"];
    const tripOptions = ["day_trip", "short_trip", "one_week", "long_trip", "weekend"];

    return (
        <div className="container py-4">
            <div className="row g-4 align-items-stretch">
                <div className="col-12 col-lg-5">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <h1 className="card-title h3 mb-3">
                                {destination.city}, {destination.country}
                            </h1>
                            <dl className="row mb-0 small">
                                <dt className="col-5 fw-semibold text-uppercase text-muted">Region</dt>
                                <dd className="col-7">{destination.region}</dd>
                                <dt className="col-5 fw-semibold text-uppercase text-muted">Coordinates</dt>
                                <dd className="col-7">
                                    {destination.latitude}, {destination.longitude}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-7">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <h2 className="h5 mb-3">Location Map</h2>
                            {mapPosition ? (
                                <MapClient position={mapPosition} destination={destination} height={360} />
                            ) : (
                                <p className="text-muted small mb-0">
                                    Map unavailable: missing or invalid coordinates.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4 mt-1">
                <div className="col-12 col-lg-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <h2 className="h5 mb-3">Experience Scores</h2>
                            <ul className="list-group list-group-flush">
                                {scoreKeys.map((key) => (
                                    <li key={key} className="list-group-item d-flex justify-content-between">
                                        <span className="text-capitalize">{key}</span>
                                        <span className="fw-semibold">{destination[key]}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-lg-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <h2 className="h5 mb-3">Recommended Trip Lengths</h2>
                            <ul className="list-group list-group-flush">
                                {tripOptions.map((flag) => (
                                    <li key={flag} className="list-group-item d-flex justify-content-between">
                                        <span className="text-capitalize">{flag.replace("_", " ")}</span>
                                        <span className="badge bg-primary-subtle text-primary">
                                            {destination[flag] ? "Available" : "Not ideal"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
