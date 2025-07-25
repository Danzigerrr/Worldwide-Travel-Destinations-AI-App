'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import qs from 'qs';

import DestinationsList from '../components/DestinationsList';

// Generic multi-select dropdown component
function MultiSelect({ label, options = [], selected = [], onChange }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value) => {
        const newSelected = selected.includes(value)
            ? selected.filter(v => v !== value)
            : [...selected, value];
        // This onChange only updates the local state in the parent (DestinationsListPage)
        // It does NOT trigger an immediate API call.
        onChange(newSelected);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full p-2 border rounded text-left flex justify-between items-center"
            >
                <span>{label}</span>
                <span>{open ? '▴' : '▾'}</span>
            </button>
            {open && (
                <div className="absolute mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto z-10">
                    {options.map(opt => (
                        <label key={opt} className="flex items-center p-2 hover:bg-gray-100">
                            <input
                                type="checkbox"
                                checked={selected.includes(opt)}
                                onChange={() => toggleOption(opt)}
                                className="mr-2"
                            />
                            <span>{opt}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function DestinationsListPage() {
    const router = useRouter();
    const [destinations, setDestinations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dynamicFilters, setDynamicFilters] = useState(null);

    const initialFilters = {
        region: [],
        country: [],
        budget_level: [],
        culture: [],
        nature: [],
        beaches: [],
        trip_type: [],
    };

    // filters now represent the currently selected but NOT YET APPLIED filters
    const [filters, setFilters] = useState(initialFilters);

    const resetFilters = () => setFilters(initialFilters);

    const handleFilterChange = (key) => (values) => {
        setFilters(prev => ({ ...prev, [key]: values }));
    };

    const fetchDestinations = async (params, header) => {
        console.log("Fetching destinations with params:", params);
        const queryString = qs.stringify(params, { arrayFormat: 'repeat' });

        const res = await axios.get(`http://localhost:8000/destinations?${queryString}`, {
            headers: header,
        });
        return res.data;
    };

    const fetchDynamicFilters = async (params, header) => {
        const queryString = qs.stringify(params, { arrayFormat: 'repeat' });
        const res = await axios.get(`http://localhost:8000/dynamic_filters?${queryString}`, {
            headers: header,
        });
        return res.data;
    };

    // This function now specifically represents the action of loading data
    // based on the CURRENT state of 'filters'
    const applyFilters = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || '';
            const header = token ? { Authorization: `Bearer ${token}` } : {};
            const params = {};

            // Build parameters from the current 'filters' state
            Object.entries(filters).forEach(([k, arr]) => {
                if (Array.isArray(arr) && arr.length > 0) {
                    params[`${k}__in`] = arr;
                }
            });

            const [destData, dynFilters] = await Promise.all([
                fetchDestinations(params, header),
                // fetchDynamicFilters(params, header), // Uncomment if needed
            ]);

            setDestinations(destData);
            setDynamicFilters(dynFilters);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Initial data load when the component mounts
    useEffect(() => {
        // Call applyFilters once on mount to get initial data without any filters applied
        // or with default filters if initialFilters had any non-empty arrays.
        applyFilters();
    }, []); // Empty dependency array: runs only once on mount

    if (loading) return <p>Loading destinations…</p>;
    if (error) return <p className="text-red-600">Error: {error.message}</p>;

    // derive filter options from dynamicFilters or fallback to data
    const regions = dynamicFilters?.region || [...new Set(destinations.map(d => d.region))];
    const countries = dynamicFilters?.country || [...new Set(destinations.map(d => d.country))];
    const budgets = dynamicFilters?.budget_level || [...new Set(destinations.map(d => d.budget_level))];
    const scores = dynamicFilters?.scores || {
        culture: [...new Set(destinations.map(d => d.culture))],
        nature: [...new Set(destinations.map(d => d.nature))],
        beaches: [...new Set(destinations.map(d => d.beaches))],
    };
    const tripTypes = dynamicFilters?.trip_type || [...new Set(
        destinations.flatMap(d => ['day_trip','weekend','long_trip','short_trip','one_week'].filter(f => d[f]))
    )];

    const humanize = s => s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="p-6">
            <h1 className="text-2xl mb-4">Destinations ({destinations.length})</h1>

            <div className="mb-6 p-4 bg-gray-50 rounded space-y-4">
                <h2 className="text-lg font-semibold">Filters</h2>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                    <MultiSelect
                        label="Region"
                        options={regions.sort()}
                        selected={filters.region}
                        onChange={handleFilterChange('region')}
                    />

                    <MultiSelect
                        label="Country"
                        options={countries.sort()}
                        selected={filters.country}
                        onChange={handleFilterChange('country')}
                    />

                    <MultiSelect
                        label="Budget"
                        options={budgets.sort()}
                        selected={filters.budget_level}
                        onChange={handleFilterChange('budget_level')}
                    />

                    <MultiSelect
                        label="Culture"
                        options={scores.culture.sort((a,b) => a - b)}
                        selected={filters.culture}
                        onChange={handleFilterChange('culture')}
                    />

                    <MultiSelect
                        label="Nature"
                        options={scores.nature.sort((a,b) => a - b)}
                        selected={filters.nature}
                        onChange={handleFilterChange('nature')}
                    />

                    <MultiSelect
                        label="Beaches"
                        options={scores.beaches.sort((a,b) => a - b)}
                        selected={filters.beaches}
                        onChange={handleFilterChange('beaches')}
                    />

                    <MultiSelect
                        label="Trip Type"
                        options={tripTypes}
                        selected={filters.trip_type}
                        onChange={handleFilterChange('trip_type')}
                    />
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={applyFilters} // Call applyFilters on button click
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                        Apply Filters
                    </button>
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            <DestinationsList destinations={destinations} tripTypes={tripTypes} humanize={humanize} router={router} />
        </div>
    );
}