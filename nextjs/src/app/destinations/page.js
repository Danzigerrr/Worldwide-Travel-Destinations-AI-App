'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function DestinationsListPage() {
    const router = useRouter();
    const [destinations, setDestinations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filters, setFilters] = useState({
        region: '',
        country: '',
        budget_level: '',
        culture__gte: '',
        nature__gte: '',
        beaches__gte: '',
        trip_type: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const fetchDest = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || '';
            const params = {};
            Object.entries(filters).forEach(([k, v]) => {
                if (v !== '' && v !== null && v !== undefined) {
                    if (k === 'trip_type') params[v] = true;
                    else params[k] = v;
                }
            });
            const res = await axios.get('http://localhost:8000/destinations', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                params,
            });
            setDestinations(res.data);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDest();
    }, []);

    if (loading) return <p>Loading destinations…</p>;
    if (error) return <p className="text-red-600">Error: {error.message}</p>;

    // --- Build dynamic dropdown options ---
    const regions = Array.from(new Set(destinations.map(d => d.region))).sort();
    const countries = Array.from(new Set(destinations.map(d => d.country))).sort();
    const budgets = Array.from(new Set(destinations.map(d => d.budget_level))).sort();

    const cultures = Array.from(new Set(destinations.map(d => d.culture))).sort((a,b)=>a-b);
    const natures = Array.from(new Set(destinations.map(d => d.nature))).sort((a,b)=>a-b);
    const beaches = Array.from(new Set(destinations.map(d => d.beaches))).sort((a,b)=>a-b);

    const tripTypes = Array.from(new Set(
        destinations.flatMap(d =>
            ['day_trip','weekend','long_trip','short_trip','one_week'].filter(f => d[f])
        )
    ));

    const humanize = s =>
        s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="p-6">
            <h1 className="text-2xl mb-4">Destinations ({destinations.length})</h1>

            <div className="mb-6 p-4 bg-gray-50 rounded space-y-4">
                <h2 className="text-lg font-semibold">Filters</h2>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                    <select name="region" value={filters.region} onChange={handleChange} className="p-2 border rounded">
                        <option value="">All Regions</option>
                        {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    <select name="country" value={filters.country} onChange={handleChange} className="p-2 border rounded">
                        <option value="">All Countries</option>
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select name="budget_level" value={filters.budget_level} onChange={handleChange} className="p-2 border rounded">
                        <option value="">All Budgets</option>
                        {budgets.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>

                    <select name="culture__gte" value={filters.culture__gte} onChange={handleChange} className="p-2 border rounded">
                        <option value="">Culture ≥</option>
                        {cultures.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>

                    <select name="nature__gte" value={filters.nature__gte} onChange={handleChange} className="p-2 border rounded">
                        <option value="">Nature ≥</option>
                        {natures.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>

                    <select name="beaches__gte" value={filters.beaches__gte} onChange={handleChange} className="p-2 border rounded">
                        <option value="">Beaches ≥</option>
                        {beaches.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select name="trip_type" value={filters.trip_type} onChange={handleChange} className="p-2 border rounded">
                        <option value="">Any Trip Type</option>
                        {tripTypes.map(flag => <option key={flag} value={flag}>{humanize(flag)}</option>)}
                    </select>
                </div>

                <button onClick={fetchDest} className="px-4 py-2 bg-blue-600 text-white rounded">Apply Filters</button>
            </div>

            {destinations.length === 0 ? (
                <p>No destinations found.</p>
            ) : (
                <ul className="space-y-4">
                    {destinations.map(dest => (
                        <li key={dest.id} className="border rounded p-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold">{dest.city}, {dest.country}</h2>
                                <p className="text-gray-600">Region: {dest.region} | Budget: {dest.budget_level}</p>
                                <p className="text-gray-600">
                                    Scores: 🌍{dest.nature} 🏖️{dest.beaches} 🎭{dest.culture}
                                </p>
                                <p className="text-gray-600">
                                    Trips: {tripTypes.filter(f => dest[f]).map(humanize).join(', ')}
                                </p>
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
