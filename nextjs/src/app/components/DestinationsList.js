export default function DestinationsList({ destinations, tripTypes, humanize, router }) {
    if (!destinations.length) {
        return <p>No destinations found.</p>;
    }
    return (
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
    );
}
