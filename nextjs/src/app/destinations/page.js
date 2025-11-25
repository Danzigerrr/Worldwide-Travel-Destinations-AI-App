'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import qs from 'qs';

import DestinationsList from '../components/DestinationsList';
import DestinationsGlobe from '../components/DestinationsGlobe';

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

    // Normalize options to objects { value: string, label: string }
    const normalizedOptions = options.map(opt => {
        if (opt && typeof opt === 'object' && 'value' in opt && 'label' in opt) {
            return { value: String(opt.value), label: String(opt.label) };
        }
        return { value: String(opt), label: String(opt) };
    });

    // Work with selected values as strings for consistent comparison
    const selectedStrings = selected.map(v => String(v));
    const selectedSet = new Set(selectedStrings);

    const toggleOption = (valueStr) => {
        // valueStr is already a string
        const isSelected = selectedSet.has(valueStr);
        const newSelected = isSelected
            ? selected.filter(v => String(v) !== valueStr)
            : [...selectedStrings, valueStr]; // return strings (backend expects strings)
        onChange(newSelected);
    };

    // Dynamically size dropdown width based on available options
    const dropdownWidth = (() => {
        const optionCount = normalizedOptions.length || 1;
        const widthPerOption = 14; // px per option to scale width smoothly
        const baseWidth = 180;
        const maxWidth = 420;
        return Math.min(maxWidth, baseWidth + optionCount * widthPerOption);
    })();

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center text-start rounded-pill shadow-sm"
            >
                <span>{label}</span>
                <span>{open ? '▴' : '▾'}</span>
            </button>
            {open && (
                <div
                    className="dropdown-menu show border-0 shadow-lg p-0 mt-2"
                    style={{
                        width: `${dropdownWidth}px`,
                        maxHeight: "240px",
                        overflowY: "auto",
                    }}
                >
                    {normalizedOptions.length > 0 ? (
                        normalizedOptions.map(opt => {
                            const isSelected = selectedSet.has(opt.value);
                            return (
                                <label
                                    key={opt.value}
                                    className={`dropdown-item d-flex align-items-center justify-content-between gap-2 ${isSelected ? "active text-white" : ""}`}
                                    style={{ cursor: "pointer" }}
                                >
                                    <div className="d-flex align-items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleOption(opt.value)}
                                            className="form-check-input"
                                        />
                                        <span>{opt.label}</span>
                                    </div>
                                    {isSelected && <span className="badge bg-light text-primary">Selected</span>}
                                </label>
                            );
                        })
                    ) : (
                        <p className="px-3 py-2 text-muted small mb-0">No options available</p>
                    )}
                </div>
            )}
        </div>
    );
}


export default function DestinationsListPage() {
    const router = useRouter();
    const [destinations, setDestinations] = useState([]);
    const [loadingDestinations, setLoadingDestinations] = useState(true); // Renamed for clarity
    const [errorDestinations, setErrorDestinations] = useState(null); // Renamed for clarity

    // State to hold ALL possible filter values from the backend
    const [possibleFilterOptions, setPossibleFilterOptions] = useState({
        region: [], country: [], budget_level: [], culture: [], adventure: [],
        nature: [], beaches: [], nightlife: [], cuisine: [], wellness: [],
        urban: [], seclusion: [], trip_type: [],
    });
    const [loadingFilterOptions, setLoadingFilterOptions] = useState(true); // New state for filter options loading
    const [errorFilterOptions, setErrorFilterOptions] = useState(null); // New state for filter options error

    const initialFilters = {
        region: [], country: [], budget_level: [], culture: [], adventure: [],
        nature: [], beaches: [], nightlife: [], cuisine: [], wellness: [],
        urban: [], seclusion: [], trip_type: [],
    };

    const [filters, setFilters] = useState(initialFilters);
    // New state for dynamic filters generated by LLM
    const [generatedDynamicFilters, setGeneratedDynamicFilters] = useState([]);
    const [generatingDynamicFilters, setGeneratingDynamicFilters] = useState(false);
    const [dynamicFilterError, setDynamicFilterError] = useState(null);


    const resetFilters = () => {
        setFilters(initialFilters);
        setGeneratedDynamicFilters([]); // Clear dynamic filters on reset
    };

    const handleFilterChange = (key) => (values) => {
        setFilters(prev => ({ ...prev, [key]: values }));
    };

    const fetchDestinationsAndOptions = async (params = {}) => {
        console.log("Fetching destinations with params:", params);
        const queryString = qs.stringify(params, { arrayFormat: 'comma' });

        const token = localStorage.getItem('token') || '';
        const header = token ? { Authorization: `Bearer ${token}` } : {};
        console.log("params:", params);
        const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
        const res = await axios.get(`${backendApiUrl}/destinations?${queryString}`, {
            headers: header,
        });
        return res.data;
    };

    const fetchDynamicFiltersFromBackend = async () => {
        setGeneratingDynamicFilters(true);
        setDynamicFilterError(null);
        try {
            // Send current filters as context for LLM if desired
            const currentFilterParams = {};
            Object.entries(filters).forEach(([k, arr]) => {
                if (Array.isArray(arr) && arr.length > 0) {
                    currentFilterParams[`${k}__in`] = arr;
                }
            });
            const queryString = qs.stringify(currentFilterParams, { arrayFormat: 'comma' });

            const token = localStorage.getItem('token') || '';
            const header = token ? { Authorization: `Bearer ${token}` } : {};
            const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
            const res = await axios.get(`${backendApiUrl}/dynamic_filters?${queryString}`, {
                headers: header,
            });

            console.log("Generated filters: ", res.data);
            setGeneratedDynamicFilters(res.data);
        } catch (err) {
            console.error("Error fetching dynamic filters:", err);
            setDynamicFilterError(err);
        } finally {
            setGeneratingDynamicFilters(false);
        }
    };

    const applyFilters = async () => {
        setLoadingDestinations(true); // Set loading for destinations only
        setErrorDestinations(null);
        try {
            const params = {};

            Object.entries(filters).forEach(([k, arr]) => {
                if (Array.isArray(arr) && arr.length > 0) {
                    params[`${k}__in`] = arr;
                }
            });

            const responseData = await fetchDestinationsAndOptions(params);

            setDestinations(responseData.destinations);
            // No longer updating possibleFilterOptions here, it's done once on mount
            // setPossibleFilterOptions(responseData.possible_values);

        } catch (err) {
            console.error("Error applying filters:", err);
            setErrorDestinations(err);
        } finally {
            setLoadingDestinations(false);
        }
    };

    // New handler for dynamic filter selection
    const handleDynamicFilterSelection = (feature, value) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            [feature]: [String(value)]
        }));
        setGeneratedDynamicFilters([]); // Clear dynamic filters
    };



    // Effect to fetch initial filter options ONCE when the component mounts
    useEffect(() => {
        const fetchInitialFilterOptions = async () => {
            setLoadingFilterOptions(true);
            setErrorFilterOptions(null);
            try {
                const responseData = await fetchDestinationsAndOptions({}); // Fetch with no initial filters to get all possible values
                setPossibleFilterOptions(responseData.possible_values);
            } catch (err) {
                console.error("Error fetching initial filter options:", err);
                setErrorFilterOptions(err);
            } finally {
                setLoadingFilterOptions(false);
            }
        };

        fetchInitialFilterOptions();
    }, []); // Empty dependency array means this runs once on mount

    // Effect to fetch destinations whenever filters change
    useEffect(() => {
        // Only fetch destinations if filter options have been loaded.
        // This prevents an initial double-fetch of destinations.
        if (!loadingFilterOptions) {
            applyFilters();
        }
    }, [filters, loadingFilterOptions]); // Dependency array: run this effect whenever 'filters' or 'loadingFilterOptions' changes

    const humanize = s => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()); // Improved humanize for 'budget_level' etc.

    // Memoize sorted options for performance and consistent order
    // Ensure these only sort after possibleFilterOptions are loaded
    const sortedRegionOptions = useMemo(() => possibleFilterOptions.region.sort(), [possibleFilterOptions.region]);
    const sortedCountryOptions = useMemo(() => possibleFilterOptions.country.sort(), [possibleFilterOptions.country]);
    const sortedBudgetOptions = useMemo(() => possibleFilterOptions.budget_level.sort(), [possibleFilterOptions.budget_level]);

    const sortedCultureOptions = useMemo(() => possibleFilterOptions.culture.sort((a, b) => a - b), [possibleFilterOptions.culture]);
    const sortedAdventureOptions = useMemo(() => possibleFilterOptions.adventure.sort((a, b) => a - b), [possibleFilterOptions.adventure]);
    const sortedNatureOptions = useMemo(() => possibleFilterOptions.nature.sort((a, b) => a - b), [possibleFilterOptions.nature]);
    const sortedBeachesOptions = useMemo(() => possibleFilterOptions.beaches.sort((a, b) => a - b), [possibleFilterOptions.beaches]);
    const sortedNightlifeOptions = useMemo(() => possibleFilterOptions.nightlife.sort((a, b) => a - b), [possibleFilterOptions.nightlife]);
    const sortedCuisineOptions = useMemo(() => possibleFilterOptions.cuisine.sort((a, b) => a - b), [possibleFilterOptions.cuisine]);
    const sortedWellnessOptions = useMemo(() => possibleFilterOptions.wellness.sort((a, b) => a - b), [possibleFilterOptions.wellness]);
    const sortedUrbanOptions = useMemo(() => possibleFilterOptions.urban.sort((a, b) => a - b), [possibleFilterOptions.urban]);
    const sortedSeclusionOptions = useMemo(() => possibleFilterOptions.seclusion.sort((a, b) => a - b), [possibleFilterOptions.seclusion]);

    const sortedTripTypeOptions = useMemo(() => possibleFilterOptions.trip_type.sort(), [possibleFilterOptions.trip_type]);


    // Render loading state for the entire page if initial filter options are still loading
    if (loadingFilterOptions) {
        return <p>Loading page...</p>; // Or a more elaborate full-page loader
    }

    // Render error for initial filter options if any
    if (errorFilterOptions) {
        return <p className="text-red-600">Error loading initial filters: {errorFilterOptions.message}</p>;
    }


    return (
        <div className="container py-4">
            <div className="mb-4">
                <h1 className="h3 mb-1">Destination Explorer</h1>
                <p className="text-muted mb-0">Tune the filters to uncover the best matches for your next trip.</p>
            </div>

            <div className="row g-4">
                <div className="col-12 col-lg-4">
                    <div className="card shadow-sm mb-4">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h2 className="h6 text-uppercase text-muted mb-0">Filters</h2>
                                <span className="badge bg-light text-dark">{destinations.length} results</span>
                            </div>
                            <div className="row row-cols-1 g-3">
                                <div className="col"><MultiSelect label="Region" options={sortedRegionOptions} selected={filters.region} onChange={handleFilterChange('region')} /></div>
                                <div className="col"><MultiSelect label="Country" options={sortedCountryOptions} selected={filters.country} onChange={handleFilterChange('country')} /></div>
                                <div className="col"><MultiSelect label="Budget" options={sortedBudgetOptions} selected={filters.budget_level} onChange={handleFilterChange('budget_level')} /></div>
                                <div className="col"><MultiSelect label="Culture" options={sortedCultureOptions} selected={filters.culture} onChange={handleFilterChange('culture')} /></div>
                                <div className="col"><MultiSelect label="Adventure" options={sortedAdventureOptions} selected={filters.adventure} onChange={handleFilterChange('adventure')} /></div>
                                <div className="col"><MultiSelect label="Nature" options={sortedNatureOptions} selected={filters.nature} onChange={handleFilterChange('nature')} /></div>
                                <div className="col"><MultiSelect label="Beaches" options={sortedBeachesOptions} selected={filters.beaches} onChange={handleFilterChange('beaches')} /></div>
                                <div className="col"><MultiSelect label="Nightlife" options={sortedNightlifeOptions} selected={filters.nightlife} onChange={handleFilterChange('nightlife')} /></div>
                                <div className="col"><MultiSelect label="Cuisine" options={sortedCuisineOptions} selected={filters.cuisine} onChange={handleFilterChange('cuisine')} /></div>
                                <div className="col"><MultiSelect label="Wellness" options={sortedWellnessOptions} selected={filters.wellness} onChange={handleFilterChange('wellness')} /></div>
                                <div className="col"><MultiSelect label="Urban" options={sortedUrbanOptions} selected={filters.urban} onChange={handleFilterChange('urban')} /></div>
                                <div className="col"><MultiSelect label="Seclusion" options={sortedSeclusionOptions} selected={filters.seclusion} onChange={handleFilterChange('seclusion')} /></div>
                                <div className="col">
                                    <MultiSelect
                                        label="Trip Type"
                                        options={sortedTripTypeOptions.map(v => ({ value: v, label: humanize(v) }))}
                                        selected={filters.trip_type}
                                        onChange={handleFilterChange('trip_type')}
                                    />
                                </div>
                            </div>
                            <div className="d-flex gap-2 mt-4">
                                <button onClick={applyFilters} className="btn btn-primary flex-fill">
                                    Apply Filters
                                </button>
                                <button onClick={resetFilters} className="btn btn-outline-secondary flex-fill">
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h2 className="h6 text-uppercase text-muted mb-0">Dynamic Filter Suggestions</h2>
                                <span className="badge bg-warning text-dark">Beta</span>
                            </div>
                            {generatedDynamicFilters.length === 0 && (
                                <button
                                    onClick={fetchDynamicFiltersFromBackend}
                                    className="btn btn-outline-primary w-100"
                                    disabled={generatingDynamicFilters}
                                    aria-hidden={generatingDynamicFilters ? "true" : "false"}
                                >
                                    {generatingDynamicFilters ? 'Generating...' : 'Get Suggestions'}
                                </button>
                            )}

                            {dynamicFilterError && (
                                <p className="text-danger small mt-2">Error generating suggestions: {dynamicFilterError.message}</p>
                            )}

                            {generatedDynamicFilters.length > 0 && (
                                <div className="mt-3">
                                    {generatedDynamicFilters.map((df, index) => (
                                        <div key={index} className="border rounded-3 p-3 mb-3 bg-light">
                                            <p className="fw-semibold mb-2">{df.question}</p>
                                            <div className="d-flex flex-wrap gap-2">
                                                {Object.entries(df.value_meanings).map(([value, meaning]) => (
                                                    <button
                                                        key={value}
                                                        onClick={() => handleDynamicFilterSelection(df.feature, value)}
                                                        className={`btn btn-sm rounded-pill ${
                                                            filters[df.feature].includes(value)
                                                                ? 'btn-primary text-white'
                                                                : 'btn-outline-secondary'
                                                        }`}
                                                    >
                                                        {meaning}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-12 col-lg-8">
                    <div className="card shadow-sm h-100">
                        <div className="card-body d-flex flex-column gap-4">
                            <div>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div>
                                        <h2 className="h6 text-uppercase text-muted mb-0">Interactive Globe</h2>
                                        <p className="text-muted small mb-0">Spin, zoom, and tap to inspect each destination.</p>
                                    </div>
                                    <span className="badge bg-primary-subtle text-primary">
                                        {destinations.length} locations
                                    </span>
                                </div>
                                {loadingDestinations ? (
                                    <div
                                        className="d-flex align-items-center justify-content-center bg-light border rounded-4 text-muted"
                                        style={{ height: 320 }}
                                    >
                                        Loading globe…
                                    </div>
                                ) : (
                                    <DestinationsGlobe destinations={destinations} height={320} />
                                )}
                            </div>

                            <div>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h2 className="h5 mb-1">Available Destinations</h2>
                                        <p className="text-muted small mb-0">{destinations.length} matches found</p>
                                    </div>
                                    <button className="btn btn-outline-primary btn-sm" onClick={applyFilters}>
                                        Refresh
                                    </button>
                                </div>
                                {loadingDestinations && <p className="text-muted">Loading destinations…</p>}
                                {errorDestinations && <p className="text-danger">Error loading destinations: {errorDestinations.message}</p>}
                                {!loadingDestinations && !errorDestinations && (
                                    <DestinationsList
                                        destinations={destinations}
                                        tripTypes={possibleFilterOptions.trip_type}
                                        humanize={humanize}
                                        router={router}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}