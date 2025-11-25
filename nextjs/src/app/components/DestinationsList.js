export default function DestinationsList({ destinations, tripTypes = [], humanize, router }) {
    const featureKeys = [
        { key: "nature", label: "Nature" },
        { key: "beaches", label: "Beaches" },
        { key: "culture", label: "Culture" },
        { key: "nightlife", label: "Nightlife" },
    ];

    if (!destinations.length) {
        return <p className="text-muted">No destinations found.</p>;
    }

    return (
        <div className="container px-0">
            <div className="row g-4">
                {destinations.map((dest) => (
                    <div key={dest.id} className="col-12 col-md-6 col-xl-4">
                        <div className="card shadow-sm h-100 border-0">
                            <div className="card-body d-flex flex-column">
                                <div>
                                    <h2 className="h5 mb-1">
                                        {dest.city}, {dest.country}
                                    </h2>
                                    <p className="text-muted small mb-2">
                                        Discover the highlights of {dest.city} with balanced experiences across culture, nature and leisure.
                                    </p>
                                    <dl className="row small mb-0 text-muted">
                                        <dt className="col-5 fw-semibold text-uppercase">Region</dt>
                                        <dd className="col-7 mb-1">{dest.region || "—"}</dd>
                                        <dt className="col-5 fw-semibold text-uppercase">Budget</dt>
                                        <dd className="col-7 mb-1">
                                            <span className="badge bg-primary-subtle text-primary text-uppercase">
                                                {dest.budget_level ? humanize(dest.budget_level) : "N/A"}
                                            </span>
                                        </dd>
                                    </dl>
                                </div>

                                <div className="mt-3">
                                    <p className="text-muted text-uppercase small fw-semibold mb-2">Experience Snapshot</p>
                                    <div className="d-flex flex-wrap gap-2">
                                        {featureKeys.map(({ key, label }) => (
                                            <span
                                                key={key}
                                                className="badge bg-light text-dark border border-light-subtle"
                                                title={`${label} score`}
                                            >
                                                {label}: <span className="fw-semibold">{dest[key] ?? "—"}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {!!tripTypes.length && (
                                    <div className="mt-3">
                                        <p className="text-muted text-uppercase small fw-semibold mb-2">Trip Types</p>
                                        <div className="d-flex flex-wrap gap-2">
                                            {tripTypes.map((type) => {
                                                if (!type) return null;
                                                const label = humanize ? humanize(type) : type;
                                                const available = Boolean(dest[type]);
                                                return (
                                                    <span
                                                        key={type}
                                                        className={`badge px-3 py-2 ${
                                                            available
                                                                ? "bg-primary-subtle text-primary"
                                                                : "bg-secondary-subtle text-secondary"
                                                        }`}
                                                    >
                                                        {label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="card-footer bg-transparent border-0 pt-0">
                                <button
                                    className="btn btn-primary w-100"
                                    onClick={() => router.push(`/destinations/${dest.id}`)}
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}