'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Map from '../components/OpenLayersMap';

export default function DestinationsPage() {
    const [destinations, setDestinations] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token") || "";
        axios.get("http://localhost:8000/destinations", {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
            .then(res => setDestinations(res.data))
            .catch(err => setError(err));
    }, []);

    if (error) return <p className="text-red-600">Error: {error.message}</p>;

    return <Map destinations={destinations} />;
}
