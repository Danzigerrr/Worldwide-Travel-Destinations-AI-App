'use client';

import { useState, useEffect, useRef, useMemo } from 'react'; // Added useMemo for sorting
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
                    {options.length > 0 ? (
                        options.map(opt => (
                            <label key={opt} className="flex items-center p-2 hover:bg-gray-100">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(opt)}
                                    onChange={() => toggleOption(opt)}
                                    className="mr-2"
                                />
                                <span>{opt}</span>
                            </label>
                        ))
                    ) : (
                        <p className="p-2 text-gray-500">No options available</p>
                    )}
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

    // State to hold ALL possible filter values from the backend
    const [possibleFilterOptions, setPossibleFilterOptions] = useState({
        region: [],
        country: [],
        budget_level: [],
        culture: [],
        adventure: [], // New
        nature: [],
        beaches: [],
        nightlife: [], // New
        cuisine: [],   // New
        wellness: [],  // New
        urban: [],     // New
        seclusion: [], // New
        trip_type: [],
    });

    const initialFilters = {
        region: [],
        country: [],
        budget_level: [],
        culture: [],
        adventure: [], // New
        nature: [],
        beaches: [],
        nightlife: [], // New
        cuisine: [],   // New
        wellness: [],  // New
        urban: [],     // New
        seclusion: [], // New
        trip_type: [],
    };

    // filters now represent the currently selected but NOT YET APPLIED filters
    const [filters, setFilters] = useState(initialFilters);

    const resetFilters = () => setFilters(initialFilters);

    const handleFilterChange = (key) => (values) => {
        setFilters(prev => ({ ...prev, [key]: values }));
    };

    const fetchDestinationsAndOptions = async (params = {}) => {
        console.log("Fetching destinations with params:", params);
        // --- CRITICAL CHANGE HERE: Use arrayFormat: 'comma' ---
        const queryString = qs.stringify(params, { arrayFormat: 'comma' }); // Changed from 'repeat'

        const token = localStorage.getItem('token') || '';
        const header = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await axios.get(`http://localhost:8000/destinations?${queryString}`, {
            headers: header,
        });
        return res.data;
    };
    const applyFilters = async () => {
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const params = {};

            // Build parameters from the current 'filters' state
            Object.entries(filters).forEach(([k, arr]) => {
                if (Array.isArray(arr) && arr.length > 0) {
                    // Fastapi-filter expects 'field__in' for lists
                    params[`${k}__in`] = arr;
                }
            });

            const responseData = await fetchDestinationsAndOptions(params);

            setDestinations(responseData.destinations);
            // This is the key change: possible_values is now part of the main response
            setPossibleFilterOptions(responseData.possible_values);

        } catch (err) {
            console.error("Error applying filters:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    // Initial data load when the component mounts
    useEffect(() => {
        applyFilters(); // Fetch initial data and all possible filter options
    }, []); // Empty dependency array: runs only once on mount

    // Helper function to humanize filter labels
    const humanize = s => s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase());

    // Memoize sorted options for performance and consistent order
    const sortedRegionOptions = useMemo(() => possibleFilterOptions.region.sort(), [possibleFilterOptions.region]);
    const sortedCountryOptions = useMemo(() => possibleFilterOptions.country.sort(), [possibleFilterOptions.country]);
    const sortedBudgetOptions = useMemo(() => possibleFilterOptions.budget_level.sort(), [possibleFilterOptions.budget_level]);

    // For score-based filters, sort numerically
    const sortedCultureOptions = useMemo(() => possibleFilterOptions.culture.sort((a, b) => a - b), [possibleFilterOptions.culture]);
    const sortedAdventureOptions = useMemo(() => possibleFilterOptions.adventure.sort((a, b) => a - b), [possibleFilterOptions.adventure]);
    const sortedNatureOptions = useMemo(() => possibleFilterOptions.nature.sort((a, b) => a - b), [possibleFilterOptions.nature]);
    const sortedBeachesOptions = useMemo(() => possibleFilterOptions.beaches.sort((a, b) => a - b), [possibleFilterOptions.beaches]);
    const sortedNightlifeOptions = useMemo(() => possibleFilterOptions.nightlife.sort((a, b) => a - b), [possibleFilterOptions.nightlife]);
    const sortedCuisineOptions = useMemo(() => possibleFilterOptions.cuisine.sort((a, b) => a - b), [possibleFilterOptions.cuisine]);
    const sortedWellnessOptions = useMemo(() => possibleFilterOptions.wellness.sort((a, b) => a - b), [possibleFilterOptions.wellness]);
    const sortedUrbanOptions = useMemo(() => possibleFilterOptions.urban.sort((a, b) => a - b), [possibleFilterOptions.urban]);
    const sortedSeclusionOptions = useMemo(() => possibleFilterOptions.seclusion.sort((a, b) => a - b), [possibleFilterOptions.seclusion]);

    // Trip types are strings, so lexical sort is fine
    const sortedTripTypeOptions = useMemo(() => possibleFilterOptions.trip_type.sort(), [possibleFilterOptions.trip_type]);


    if (loading) return <p>Loading destinations…</p>;
    if (error) return <p className="text-red-600">Error: {error.message}</p>;

    return (
        <div className="p-6">
            <h1 className="text-2xl mb-4">Destinations ({destinations.length})</h1>

            <div className="mb-6 p-4 bg-gray-50 rounded space-y-4">
                <h2 className="text-lg font-semibold">Filters</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {/* Region Filter */}
                    <MultiSelect
                        label="Region"
                        options={sortedRegionOptions}
                        selected={filters.region}
                        onChange={handleFilterChange('region')}
                    />

                    {/* Country Filter */}
                    <MultiSelect
                        label="Country"
                        options={sortedCountryOptions}
                        selected={filters.country}
                        onChange={handleFilterChange('country')}
                    />

                    {/* Budget Filter */}
                    <MultiSelect
                        label="Budget"
                        options={sortedBudgetOptions}
                        selected={filters.budget_level}
                        onChange={handleFilterChange('budget_level')}
                    />

                    {/* Culture Score Filter */}
                    <MultiSelect
                        label="Culture"
                        options={sortedCultureOptions}
                        selected={filters.culture}
                        onChange={handleFilterChange('culture')}
                    />

                    {/* Adventure Score Filter (NEW) */}
                    <MultiSelect
                        label="Adventure"
                        options={sortedAdventureOptions}
                        selected={filters.adventure}
                        onChange={handleFilterChange('adventure')}
                    />

                    {/* Nature Score Filter */}
                    <MultiSelect
                        label="Nature"
                        options={sortedNatureOptions}
                        selected={filters.nature}
                        onChange={handleFilterChange('nature')}
                    />

                    {/* Beaches Score Filter */}
                    <MultiSelect
                        label="Beaches"
                        options={sortedBeachesOptions}
                        selected={filters.beaches}
                        onChange={handleFilterChange('beaches')}
                    />

                    {/* Nightlife Score Filter (NEW) */}
                    <MultiSelect
                        label="Nightlife"
                        options={sortedNightlifeOptions}
                        selected={filters.nightlife}
                        onChange={handleFilterChange('nightlife')}
                    />

                    {/* Cuisine Score Filter (NEW) */}
                    <MultiSelect
                        label="Cuisine"
                        options={sortedCuisineOptions}
                        selected={filters.cuisine}
                        onChange={handleFilterChange('cuisine')}
                    />

                    {/* Wellness Score Filter (NEW) */}
                    <MultiSelect
                        label="Wellness"
                        options={sortedWellnessOptions}
                        selected={filters.wellness}
                        onChange={handleFilterChange('wellness')}
                    />

                    {/* Urban Score Filter (NEW) */}
                    <MultiSelect
                        label="Urban"
                        options={sortedUrbanOptions}
                        selected={filters.urban}
                        onChange={handleFilterChange('urban')}
                    />

                    {/* Seclusion Score Filter (NEW) */}
                    <MultiSelect
                        label="Seclusion"
                        options={sortedSeclusionOptions}
                        selected={filters.seclusion}
                        onChange={handleFilterChange('seclusion')}
                    />

                    {/* Trip Type Filter */}
                    <MultiSelect
                        label="Trip Type"
                        options={sortedTripTypeOptions.map(humanize)} // Humanize the display names
                        selected={filters.trip_type}
                        onChange={handleFilterChange('trip_type')}
                    />
                </div>

                <div className="flex space-x-2 mt-4"> {/* Added mt-4 for spacing */}
                    <button
                        onClick={applyFilters}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Apply Filters
                    </button>
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* Pass tripTypes to DestinationsList for display */}
            <DestinationsList destinations={destinations} tripTypes={possibleFilterOptions.trip_type} humanize={humanize} router={router} />
        </div>
    );
}