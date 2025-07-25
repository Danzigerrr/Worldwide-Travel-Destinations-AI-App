export default function DestinationsList({ destinations, tripTypes, humanize, router }) {
    if (!destinations.length) {
        return <p>No destinations found.</p>;
    }
    return (
        <ul className="space-y-6">
            {destinations.map(dest => (
                <li
                    key={dest.id}
                    className="border rounded p-4 flex justify-between items-center max-w-2xl w-1/2 mx-auto"
                >
                    <div className="w-3/4 space-y-1">
                        <h2 className="text-xl font-semibold">
                            {dest.city}, {dest.country}
                        </h2>
                        <p className="text-gray-600">
                            Region: {dest.region} | Budget: {dest.budget_level}
                        </p>
                        <p className="text-gray-600">
                            Features:&nbsp;
                            Nature 🌍 {dest.nature} &nbsp;&nbsp;
                            Beach 🏖️ {dest.beaches} &nbsp;&nbsp;
                            Culture 🎭 {dest.culture}
                        </p>
                    </div>
                    <button
                        className="ml-6 px-3 py-1 bg-blue-600 text-white rounded"
                        onClick={() => router.push(`/destinations/${dest.id}`)}
                    >
                        View Details
                    </button>
                </li>
            ))}
        </ul>
    );
}
