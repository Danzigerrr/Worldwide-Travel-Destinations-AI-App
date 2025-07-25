"use client";

import { useContext, useState, useEffect } from 'react';
import AuthContext from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import axios from 'axios';

const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const [destinations, setDestinations] = useState([]);
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [destinationRegion, setDestinationRegion] = useState('');
  const [destinationLongitude, setDestinationLongitude] = useState('');
  const [destinationLatitude, setDestinationLatitude] = useState('');

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const token = localStorage.getItem('token'); 
        const [destinationsResponse] = await Promise.all([
          axios.get('http://localhost:8000/destinations/destinations', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setDestinations(destinationsResponse.data);

      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchDestinations();
  }, []);

  const handleCreateDestination = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8000/destinations', {
        city: destinationCity,
        country: destinationCountry,
        region: destinationRegion,
        longitude: destinationLongitude,
        latitude: destinationLatitude,
        headers: { Authorization: `Bearer ${token}`},
        });
      setDestinations([...destinations, response.data]);
      setDestinationCity('');
      setDestinationCountry('');
      setDestinationRegion('');
      setDestinationLongitude('');
      setDestinationLatitude('');
    } catch (error) {
      console.error('Failed to create destinations:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container">
        <h1>Welcome!</h1>
        <button onClick={logout} className="btn btn-danger">Logout</button>

        <div className="accordion mt-5 mb-5" id="accordionExample">
          <div className="accordion-item">
            <h2 className="accordion-header" id="headingOne">
              <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                Create Destination
              </button>
            </h2>
            <div id="collapseOne" className="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionExample">
              <div className="accordion-body">
                <form onSubmit={handleCreateDestination}>
                  <div className="mb-3">
                    <label htmlFor="destinationCity" className="form-label">Destination City</label>
                    <input
                      type="text"
                      className="form-control"
                      id="destinationCity"
                      value={destinationCity}
                      onChange={(e) => setDestinationCity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="destinationCountry" className="form-label">Destination Country</label>
                    <input
                      type="text"
                      className="form-control"
                      id="destinationCountry"
                      value={destinationCountry}
                      onChange={(e) => setDestinationCountry(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="destinationRegion" className="form-label">Destination Region</label>
                    <input
                      type="text"
                      className="form-control"
                      id="destinationRegion"
                      value={destinationRegion}
                      onChange={(e) => setDestinationRegion(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="destinationLongitude" className="form-label">Destination Longitude</label>
                    <input
                      type="text"
                      className="form-control"
                      id="destinationLongitude"
                      value={destinationLongitude}
                      onChange={(e) => setDestinationLongitude(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="destinationLatitude" className="form-label">Destination Latitude</label>
                    <input
                      type="text"
                      className="form-control"
                      id="destinationLatitude"
                      value={destinationLatitude}
                      onChange={(e) => setDestinationLatitude(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Create Destination</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Home;