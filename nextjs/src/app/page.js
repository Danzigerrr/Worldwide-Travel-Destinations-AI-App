"use client";

import { useContext, useState, useEffect } from 'react';
import AuthContext from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import axios from 'axios';

const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const [destinations, setDestinations] = useState([]);
  const [destinationName, setDestinationName] = useState('');
  const [destinationDescription, setDestinationDescription] = useState('');
  const [selectedDestinations, setSelectedDestinations] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token") ? JSON.parse(localStorage.getItem("token")) : null;
  }, []);

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
      const response = await axios.post('http://localhost:8000/destinations', {
        name: destinationName,
        description: destinationDescription,
      });
      setDestinations([...destinations, response.data]);
      setDestinationName('');
      setDestinationDescription('');
    } catch (error) {
      console.error('Failed to create destination:', error);
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
                    <label htmlFor="destinationName" className="form-label">Destination Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="destinationName"
                      value={destinationName}
                      onChange={(e) => setDestinationName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="destinationDescription" className="form-label">Destination Description</label>
                    <input
                      type="text"
                      className="form-control"
                      id="destinationDescription"
                      value={destinationDescription}
                      onChange={(e) => setDestinationDescription(e.target.value)}
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