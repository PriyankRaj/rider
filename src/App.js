// CHECKPOINT-1: Initial implementation with AdvancedMarkerElement
// Features:
// - Split screen layout with rider list and map
// - Real-time rider location updates
// - Distance calculations between riders
// - Custom pin markers with rider initials
// - Info windows on marker click
// - Automatic map bounds adjustment
// - 30-second refresh interval
// - Error handling and display
// - Clean marker management

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript, InfoWindow, Marker } from '@react-google-maps/api';
import axios from 'axios';
import './App.css';
import DatePicker from 'react-datepicker';

const libraries = ['places', 'marker', 'marker.AdvancedMarkerElement'];
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  position: 'absolute'
};

const mapOptions = {
  disableDefaultUI: false,
  clickableIcons: false,
  scrollwheel: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  mapId: process.env.REACT_APP_GOOGLE_MAPS_MAP_ID || '8f348c1def43f8f4'
};

// Default center (Hyderabad)
const defaultCenter = {
  lat: 17.3850,
  lng: 78.4867,
};

// Function to calculate distance between two points in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Function to validate coordinates
const validateCoordinates = (lat, lng) => {
  return typeof lat === 'number' && typeof lng === 'number' && 
         !isNaN(lat) && !isNaN(lng) &&
         lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Update the RiderConfig component to handle multiple riders
const RiderConfig = ({ riders, onUpdate, onClose }) => {
  const [formData, setFormData] = useState(
    riders.reduce((acc, rider) => ({
      ...acc,
      [rider.id]: {
        name: rider.name,
        speed: rider.speed,
        stamina: rider.stamina,
        fatigue: rider.fatigue
      }
    }), {})
  );

  const handleChange = (riderId, e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [riderId]: {
        ...prev[riderId],
        [name]: name === 'name' ? value : parseFloat(value)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      for (const riderId in formData) {
        await onUpdate(riderId, formData[riderId]);
      }
      onClose();
    } catch (error) {
      console.error('Error updating riders:', error);
    }
  };

  return (
    <div className="rider-config-modal">
      <div className="rider-config-content">
        <h3>Edit Rider Configurations</h3>
        <form onSubmit={handleSubmit}>
          <div className="rider-config-grid">
            {riders.map((rider) => (
              <div key={rider.id} className="rider-config-group">
                <h4>Rider {rider.id.replace('rider', '')}</h4>
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    name="name"
                    value={formData[rider.id].name}
                    onChange={(e) => handleChange(rider.id, e)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Speed:</label>
                  <input
                    type="number"
                    name="speed"
                    value={formData[rider.id].speed}
                    onChange={(e) => handleChange(rider.id, e)}
                    step="0.001"
                    min="0.01"
                    max="0.1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Stamina:</label>
                  <input
                    type="number"
                    name="stamina"
                    value={formData[rider.id].stamina}
                    onChange={(e) => handleChange(rider.id, e)}
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fatigue:</label>
                  <input
                    type="number"
                    name="fatigue"
                    value={formData[rider.id].fatigue}
                    onChange={(e) => handleChange(rider.id, e)}
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit">Save All</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add new RaceConfig component
const RaceConfig = ({ onUpdate, onClose }) => {
  const [formData, setFormData] = useState({
    baseSpeed: 0.01,
    staminaDrain: 0.01,
    fatigueRate: 0.005
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onUpdate(formData);
      onClose();
    } catch (error) {
      console.error('Error updating race config:', error);
    }
  };

  return (
    <div className="rider-config-modal">
      <div className="rider-config-content">
        <h3>Race Configuration</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Base Speed:</label>
            <input
              type="number"
              name="baseSpeed"
              value={formData.baseSpeed}
              onChange={handleChange}
              step="0.001"
              min="0.01"
              max="0.1"
              required
            />
          </div>
          <div className="form-group">
            <label>Stamina Drain Rate:</label>
            <input
              type="number"
              name="staminaDrain"
              value={formData.staminaDrain}
              onChange={handleChange}
              step="0.001"
              min="0.001"
              max="0.1"
              required
            />
          </div>
          <div className="form-group">
            <label>Fatigue Rate:</label>
            <input
              type="number"
              name="fatigueRate"
              value={formData.fatigueRate}
              onChange={handleChange}
              step="0.001"
              min="0.001"
              max="0.1"
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add new RideScreen component
const RideScreen = ({ onClose }) => {
  const [formData, setFormData] = useState({
    rideName: '',
    startLocation: '',
    startTime: new Date(),
    notes: ''
  });
  const [locationError, setLocationError] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    // Get current location when component mounts
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Reverse geocode to get address
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setIsLoadingLocation(false);
              if (status === 'OK' && results[0]) {
                setFormData(prev => ({
                  ...prev,
                  startLocation: results[0].formatted_address
                }));
              } else {
                setLocationError('Could not get address from coordinates');
              }
            }
          );
        },
        (error) => {
          setIsLoadingLocation(false);
          setLocationError('Could not get your location. Please enter it manually.');
        }
      );
    } else {
      setIsLoadingLocation(false);
      setLocationError('Geolocation is not supported by your browser');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateTimeChange = (date) => {
    setFormData(prev => ({
      ...prev,
      startTime: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Here you would typically send the data to your backend
      console.log('Ride data:', formData);
      onClose();
    } catch (error) {
      console.error('Error creating ride:', error);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content ride-screen">
        <h2>Create New Ride</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ride Name (optional)</label>
            <input
              type="text"
              name="rideName"
              value={formData.rideName}
              onChange={handleChange}
              placeholder="Enter ride name"
            />
          </div>

          <div className="form-group">
            <label>Start Location</label>
            <div className="location-input-group">
              <input
                type="text"
                name="startLocation"
                value={formData.startLocation}
                onChange={handleChange}
                placeholder="Enter start location"
                disabled={isLoadingLocation}
              />
              <button
                type="button"
                onClick={getCurrentLocation}
                className="location-button"
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? 'Getting Location...' : 'Use Current Location'}
              </button>
            </div>
            {locationError && <div className="error-message">{locationError}</div>}
          </div>

          <div className="form-group">
            <label>Start Time</label>
            <DatePicker
              selected={formData.startTime}
              onChange={handleDateTimeChange}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
              className="date-picker"
            />
          </div>

          <div className="form-group">
            <label>Notes/Instructions (optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter any notes or instructions"
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="create-button">
              Create Ride
            </button>
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const mapRef = useRef();
  const markersRef = useRef([]);
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);
  const [raceCompleted, setRaceCompleted] = useState(false);
  const [winner, setWinner] = useState(null);
  const [raceInProgress, setRaceInProgress] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [showRaceConfig, setShowRaceConfig] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRiders, setEditingRiders] = useState([]);
  const [showRideScreen, setShowRideScreen] = useState(false);

  // Using our local API endpoint
  const apiUrl = 'http://localhost:3001/api/riders';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
    version: 'beta'
  });

  const createPinElement = (rider, isSelected) => {
    if (!window.google || !window.google.maps) return null;
    
    // Create the motorcycle icon using a simple image
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.cursor = 'pointer';

    // Create the motorcycle icon using a simple image
    const bikeIcon = document.createElement('img');
    bikeIcon.src = 'https://maps.google.com/mapfiles/kml/shapes/motorcycling.png';
    bikeIcon.style.width = '32px';
    bikeIcon.style.height = '32px';
    bikeIcon.style.marginBottom = '4px';
    container.appendChild(bikeIcon);

    // Create the name label
    const nameLabel = document.createElement('div');
    nameLabel.textContent = rider.name;
    nameLabel.style.backgroundColor = isSelected ? '#34A853' : '#4285F4';
    nameLabel.style.color = 'white';
    nameLabel.style.padding = '2px 6px';
    nameLabel.style.borderRadius = '4px';
    nameLabel.style.fontSize = '12px';
    nameLabel.style.fontWeight = 'bold';
    nameLabel.style.whiteSpace = 'nowrap';
    nameLabel.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

    // Add hover effect
    container.addEventListener('mouseenter', () => {
      nameLabel.style.transform = 'scale(1.1)';
    });
    container.addEventListener('mouseleave', () => {
      nameLabel.style.transform = 'scale(1)';
    });

    // Add elements to container
    container.appendChild(nameLabel);

    return container;
  };

  // Function to update map view based on riders' locations
  const updateMapView = (riders) => {
    if (!mapRef.current || riders.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    let validRiders = 0;

    riders.forEach(rider => {
      if (validateCoordinates(rider.latitude, rider.longitude)) {
        bounds.extend({ lat: rider.latitude, lng: rider.longitude });
        validRiders++;
      }
    });

    if (validRiders > 0) {
      // Add padding to the bounds
      const padding = 0.1;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const latPadding = (ne.lat() - sw.lat()) * padding;
      const lngPadding = (ne.lng() - sw.lng()) * padding;
      
      bounds.extend({ lat: ne.lat() + latPadding, lng: ne.lng() + lngPadding });
      bounds.extend({ lat: sw.lat() - latPadding, lng: sw.lng() - lngPadding });

      mapRef.current.fitBounds(bounds);
    }
  };

  const updateMarkers = (riders) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];

    // Create new markers
    riders.forEach(rider => {
      if (!validateCoordinates(rider.latitude, rider.longitude)) {
        console.error(`Invalid coordinates for rider ${rider.name}:`, rider.latitude, rider.longitude);
        return;
      }

      const isSelected = selectedRider?.id === rider.id;
      const element = createPinElement(rider, isSelected);
      
      if (element && window.google && window.google.maps && window.google.maps.marker) {
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat: rider.latitude, lng: rider.longitude },
          map: mapRef.current,
          title: rider.name,
          gmpClickable: true,
          content: element
        });

        marker.addEventListener('gmp-click', () => {
          setSelectedRider(rider);
          setInfoWindowOpen(true);
        });

        markersRef.current.push(marker);
      }
    });
  };

  const fetchRiderLocations = async () => {
    try {
      setError(null);
      const response = await axios.get('http://localhost:3001/api/riders');
      const { riders: newRiders, raceCompleted, raceInProgress, winner } = response.data;
      
      // Calculate distances from leader
      const leader = newRiders.find(r => r.position === 1);
      if (leader) {
        newRiders.forEach(rider => {
          if (rider.position !== 1) {
            rider.distanceFromLeader = calculateDistance(
              leader.latitude,
              leader.longitude,
              rider.latitude,
              rider.longitude
            );
          }
        });
      }

      // Calculate time and average speed for each rider
      if (raceCompleted) {
        newRiders.forEach(rider => {
          if (rider.finished) {
            // Calculate total time in minutes and seconds
            const totalSeconds = Math.floor((new Date(rider.finishTime) - new Date(rider.startTime)) / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            rider.totalTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Calculate average speed in km/h
            const totalDistance = calculateDistance(
              rider.startLatitude,
              rider.startLongitude,
              rider.latitude,
              rider.longitude
            );
            const hours = totalSeconds / 3600;
            rider.averageSpeed = totalDistance / hours;
          }
        });
      }
      
      setRiders(newRiders);
      setRaceInProgress(raceInProgress);
      setRaceCompleted(raceCompleted);
      setWinner(winner);
      
      // Only update map and markers if race is still in progress
      if (raceInProgress) {
        updateMapView(newRiders);
        updateMarkers(newRiders);
      }
    } catch (err) {
      console.error('Error fetching rider locations:', err);
      setError('Failed to fetch rider locations');
    }
  };

  const restartRace = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/restart-race');
      if (response.data.message === 'Race reset successfully') {
        // Update the riders state with the reset positions
        setRiders(response.data.riders);
        setRaceInProgress(false);
        setRaceCompleted(false);
        setWinner(null);
        
        // Update map view to show riders at starting position
        updateMapView(response.data.riders);
        updateMarkers(response.data.riders);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to restart race');
    }
  };

  const startRace = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/start-race');
      if (response.data.message === 'Race started successfully') {
        setRaceInProgress(true);
        setRaceCompleted(false);
        setWinner(null);
        fetchRiderLocations();
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to start race');
    }
  };

  // Add new function to handle rider updates
  const handleUpdateRider = async (riderId, updates) => {
    try {
      const response = await axios.put(`http://localhost:3001/api/riders/${riderId}`, updates);
      if (response.data) {
        setRiders(prevRiders => 
          prevRiders.map(rider => 
            rider.id === riderId ? { ...rider, ...updates } : rider
          )
        );
      }
    } catch (error) {
      console.error('Error updating rider:', error);
      setError('Failed to update rider');
    }
  };

  // Add new function to handle race configuration updates
  const handleUpdateRaceConfig = async (config) => {
    try {
      const response = await axios.put('http://localhost:3001/api/race-config', {
        baseSpeed: parseFloat(config.baseSpeed),
        staminaDrain: parseFloat(config.staminaDrain),
        fatigueRate: parseFloat(config.fatigueRate)
      });
      
      if (response.data.message === 'Race configuration updated successfully') {
        // Refresh rider data to get updated configurations
        fetchRiderLocations();
      }
    } catch (error) {
      console.error('Error updating race config:', error);
      setError(error.response?.data?.error || 'Failed to update race configuration');
    }
  };

  // Update the InfoWindow content in the map
  const renderInfoWindow = () => {
    if (!selectedRider) return null;
    
    return (
      <InfoWindow
        position={{
          lat: selectedRider.latitude,
          lng: selectedRider.longitude
        }}
        onCloseClick={() => {
          setSelectedRider(null);
          setShowConfig(false);
        }}
      >
        <div className="info-window">
          <h3>{selectedRider.name}</h3>
          <p>Speed: {selectedRider.currentSpeedKmh || '0.0'} km/h</p>
          <p>Position: {selectedRider.position || 'N/A'}</p>
          <p>Stamina: {(selectedRider.stamina || 0).toFixed(1)}%</p>
          <p>Fatigue: {(selectedRider.fatigue || 0).toFixed(1)}%</p>
          <p>Location: {selectedRider.location || 'Unknown'}</p>
          <button 
            onClick={() => setShowConfig(true)}
            className="edit-button"
          >
            Edit Configuration
          </button>
        </div>
      </InfoWindow>
    );
  };

  const handleRandomizeRiders = async () => {
    try {
      const response = await axios.put('http://localhost:3001/api/ridersrandomize');
      if (response.data.success) {
        setRiders(response.data.riders);
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error randomizing riders:', error);
      setError('Failed to randomize riders');
    }
  };

  // Add new function to handle rider name updates
  const handleUpdateRiderName = async (riderId, newName) => {
    try {
      const response = await axios.put(`http://localhost:3001/api/riders/${riderId}`, {
        name: newName
      });
      
      setRiders(prevRiders => 
        prevRiders.map(rider => 
          rider.id === riderId ? { ...rider, name: newName } : rider
        )
      );
    } catch (error) {
      console.error('Error updating rider name:', error);
      setError('Failed to update rider name');
    }
  };

  // Update the Edit Riders modal
  const EditRidersModal = () => {
    const [tempRiders, setTempRiders] = useState([...riders]);
    const [newRiderName, setNewRiderName] = useState('');

    if (!showEditModal) return null;

    const handleNameChange = (riderId, newName) => {
      setTempRiders(prevRiders =>
        prevRiders.map(rider =>
          rider.id === riderId ? { ...rider, name: newName } : rider
        )
      );
    };

    const handleAddRider = async () => {
      if (!newRiderName.trim()) return;
      
      try {
        const response = await axios.put('http://localhost:3001/api/riders/new', {
          action: 'add',
          name: newRiderName
        });
        
        if (response.data) {
          setTempRiders(prevRiders => [...prevRiders, response.data]);
          setNewRiderName('');
        }
      } catch (error) {
        console.error('Error adding rider:', error);
        setError('Failed to add rider');
      }
    };

    const handleDeleteRider = async (riderId) => {
      try {
        const response = await axios.put(`http://localhost:3001/api/riders/${riderId}`, {
          action: 'delete'
        });
        
        if (response.data.message === 'Rider deleted successfully') {
          setTempRiders(prevRiders => prevRiders.filter(rider => rider.id !== riderId));
        }
      } catch (error) {
        console.error('Error deleting rider:', error);
        setError('Failed to delete rider');
      }
    };

    const handleSave = async () => {
      try {
        // Update all riders
        await Promise.all(
          tempRiders.map(rider =>
            handleUpdateRiderName(rider.id, rider.name)
          )
        );
        setShowEditModal(false);
      } catch (error) {
        console.error('Error saving rider names:', error);
        setError('Failed to save rider names');
      }
    };

    return (
      <div className="modal">
        <div className="modal-content">
          <h2>Edit Riders</h2>
          
          {/* Add Rider Section */}
          <div className="add-rider-section">
            <input
              type="text"
              value={newRiderName}
              onChange={(e) => setNewRiderName(e.target.value)}
              placeholder="Enter new rider name"
              className="add-rider-input"
            />
            <button 
              onClick={handleAddRider}
              className="add-rider-button"
              disabled={!newRiderName.trim()}
            >
              Add Rider
            </button>
          </div>

          <div className="rider-config-grid">
            {tempRiders.map((rider) => (
              <div key={rider.id} className="rider-config-group">
                <div className="rider-header">
                  <h3>Rider {rider.id.replace('rider', '')}</h3>
                  <button 
                    onClick={() => handleDeleteRider(rider.id)}
                    className="delete-rider-button"
                  >
                    Delete
                  </button>
                </div>
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={rider.name}
                    onChange={(e) => handleNameChange(rider.id, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="modal-buttons">
            <button onClick={handleRandomizeRiders} className="random-button">
              Random
            </button>
            <button onClick={handleSave} className="save-button">
              Save
            </button>
            <button onClick={() => setShowEditModal(false)} className="cancel-button">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchRiderLocations();
    
    // Only set up interval if race is in progress
    const interval = raceInProgress && !raceCompleted ? setInterval(fetchRiderLocations, 200) : null;
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [raceInProgress, raceCompleted]);

  // Update markers when selected rider changes
  useEffect(() => {
    if (mapRef.current && window.google) {
      updateMarkers(riders);
    }
  }, [selectedRider]);

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading...</div>;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Rider Tracker</h1>
        <div className="controls">
          <button 
            onClick={() => setShowRideScreen(true)}
            className="control-button"
          >
            Create Ride
          </button>
          <button onClick={fetchRiderLocations} className="refresh-button">
            Refresh
          </button>
          <button 
            onClick={startRace} 
            disabled={raceInProgress || raceCompleted}
            className="control-button"
          >
            Start Race
          </button>
          <button 
            onClick={restartRace} 
            disabled={!raceCompleted}
            className="control-button"
          >
            Restart Race
          </button>
          <button 
            onClick={() => setShowEditModal(true)}
            disabled={raceInProgress || raceCompleted}
            className="control-button"
          >
            Edit Riders
          </button>
          <button 
            className="config-button"
            onClick={() => setShowRaceConfig(true)}
            disabled={raceInProgress || raceCompleted}
          >
            Configure Race
          </button>
        </div>
      </header>
      <div className="split-container">
        <div className="left-panel">
          <div className="rider-list">
            <h2>Rider Positions</h2>
            {raceCompleted && winner && (
              <div className="winner-banner">
                <h3>🏆 Race Completed! 🏆</h3>
                <p>Winner: {winner.name}</p>
                <p>Finish Time: {winner.finishTime ? new Date(winner.finishTime).toLocaleTimeString() : 'N/A'}</p>
                <p>Race Duration: {winner.raceDuration || 'N/A'}</p>
              </div>
            )}
            <ul>
              {riders.map((rider) => (
                <li 
                  key={rider.id} 
                  className={selectedRider?.id === rider.id ? 'selected' : ''}
                  onClick={() => !raceInProgress && setSelectedRider(rider)}
                >
                  <span className="position">#{rider.position || 'N/A'}</span>
                  <span className="name">{rider.name}</span>
                  {raceCompleted ? (
                    <>
                      <span className="time">Time: {rider.totalTime || 'N/A'}</span>
                      <span className="avg-speed">Avg Speed: {rider.averageSpeed ? `${rider.averageSpeed.toFixed(2)} km/h` : 'N/A'}</span>
                    </>
                  ) : (
                    rider.position !== 1 && (
                      <span className="distance">
                        {rider.distanceFromLeader ? `${rider.distanceFromLeader.toFixed(2)} km behind` : 'N/A'}
                      </span>
                    )
                  )}
                  {rider.finished && <span className="finished">🏁</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="right-panel">
          {loadError && (
            <div className="error-message">
              Error loading maps: {loadError.message}
            </div>
          )}
          {!isLoaded ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              backgroundColor: '#f5f5f5'
            }}>
              Loading maps...
            </div>
          ) : (
            <div className="map-container">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={mapCenter}
                options={mapOptions}
                onLoad={map => {
                  mapRef.current = map;
                  console.log("Map loaded successfully");
                  if (riders.length > 0) {
                    updateMapView(riders);
                  }
                }}
                onError={(error) => {
                  console.error("Map error:", error);
                  setError("Error loading map. Please check your API key and Map ID.");
                }}
              >
                {renderInfoWindow()}
              </GoogleMap>
            </div>
          )}
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      {showConfig && (
        <RiderConfig
          riders={riders}
          onUpdate={handleUpdateRider}
          onClose={() => {
            setShowConfig(false);
            setSelectedRider(null);
          }}
        />
      )}

      {showRaceConfig && (
        <RaceConfig
          onUpdate={handleUpdateRaceConfig}
          onClose={() => setShowRaceConfig(false)}
        />
      )}

      <EditRidersModal />

      {showRideScreen && (
        <RideScreen onClose={() => setShowRideScreen(false)} />
      )}
    </div>
  );
}

export default App; 
