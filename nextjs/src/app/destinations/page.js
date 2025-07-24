'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function DestinationsListPage() {
    const router = useRouter();
    const [destinations, setDestinations] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const token = localStorage.getItem('token') || '';
                const res = await axios.get('http://localhost:8000/destinations', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                setDestinations(res.data);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    if (loading) return <p>Loading destinations…</p>;
    if (error) return <p className="text-red-600">Error: {error.message}</p>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Destinations</h1>

            {destinations.length === 0 ? (
                <p>No destinations available.</p>
            ) : (
                <ul className="space-y-4">
                    {destinations.map((dest) => (
                        <li
                            key={dest.id}
                            className="border rounded p-4 flex justify-between items-center"
                        >
                            <div>
                                <h2 className="text-xl font-semibold">
                                    {dest.city}, {dest.country}
                                </h2>
                                <p className="text-gray-600">Region: {dest.region}</p>
                            </div>
                            <button
                                className="ml-4 px-3 py-1 bg-blue-600 text-white rounded"
                                onClick={() => router.push(`/destinations/${dest.id}`)}
                            >
                                View Details
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
