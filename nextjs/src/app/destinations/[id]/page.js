"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

export default function DestinationDetailsPage() {
    const { id: destinationId } = useParams();
    const [destination, setDestination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!destinationId) return;

        (async () => {
            try {
                const token = localStorage.getItem("token") || "";
                const res = await axios.get(
                    `http://localhost:8000/destinations/${destinationId}`,
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

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">
                {destination.city}, {destination.country}
            </h1>
            <p><strong>Region:</strong> {destination.region}</p>
            <p><strong>Coords:</strong> {destination.latitude}, {destination.longitude}</p>

            <h2 className="mt-4 text-xl">Scores</h2>
            <ul className="list-disc ml-5">
                {["culture", "adventure", "nature", "beaches", "nightlife", "cuisine", "wellness", "urban", "seclusion"].map((key) => (
                    <li key={key}><strong>{key}:</strong> {destination[key]}</li>
                ))}
            </ul>

            <h2 className="mt-4 text-xl">Trip Options</h2>
            <ul className="list-disc ml-5">
                {["day_trip", "short_trip", "one_week", "long_trip", "weekend"].map((flag) => (
                    <li key={flag}>
                        <strong>{flag.replace("_", " ")}:</strong> {destination[flag] ? "Yes" : "No"}
                    </li>
                ))}
            </ul>
        </div>
    );
}
