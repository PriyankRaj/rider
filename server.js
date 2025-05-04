const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Add JSON body parser middleware
app.use(express.json());
app.use(cors());

// Add request logging middleware
app.use((req, res, next) => {
  next();
});

// Test endpoint for Directions API
app.get('/test-route', async (req, res) => {
  try {
    const origin = '17.4225,78.4512'; // Mall
    const destination = '17.4533,78.4677'; // Airport
    const apiKey = "AIzaSyDWAVtHEH-0aA92ETZ1RuUgPpZzh4wJ4Ns";
    
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${apiKey}`
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error testing route:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message });
  }
});

// Indian names for riders
const riderNames = [
  "Arjun Reddy",
  "Priya Sharma",
  "Rahul Patel",
  "Ananya Gupta"
];

// Route coordinates for the single route
const routeCoordinates = [
  { lat: 17.4578165, lng: 78.3639655 }, // Sarath City Capital Mall
  { lat: 17.2403, lng: 78.4294 }  // Rajiv Gandhi International Airport, Shamshabad
];

// Initialize route segments array
let routeSegments = [];

// Function to decode polyline points
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
  }

  return points;
}

// Function to get route from Google Maps Directions API
async function getRoute(start, end) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: `${start.lat},${start.lng}`,
        destination: `${end.lat},${end.lng}`,
        mode: 'driving',
        key: "AIzaSyDWAVtHEH-0aA92ETZ1RuUgPpZzh4wJ4Ns",
      }
    });

    if (response.data.status === 'OK' && response.data.routes[0]) {
      const route = response.data.routes[0];
      const points = [];
      
      const decodedPath = decodePolyline(route.overview_polyline.points);
      
      decodedPath.forEach(point => {
        points.push({
          lat: point.lat,
          lng: point.lng
        });
      });

      return points;
    } else {
      console.error('No route found:', response.data.status);
      return null;
    }
  } catch (error) {
    console.error('Error getting route:', error);
    return null;
  }
}

// Race tracking variables
let raceInProgress = false;
let raceCompleted = false;
let winner = null;
let currentLeg = 0;
let lastUpdate = Date.now();
let raceStartTime = null;

// Initialize riders with random speeds
const riders = riderNames.map((name, index) => ({
  id: `rider${index + 1}`,
  name: name,
  latitude: routeCoordinates[0].lat,
  longitude: routeCoordinates[0].lng,
  speed: (Math.random() * 0.002) + 0.001, // Increased initial speeds (0.001-0.003)
  progress: 0,
  location: 'Sarath City Capital Mall',
  lastUpdated: Date.now(),
  position: index + 1,
  stamina: 100,
  boost: false,
  boostTimer: 0,
  fatigue: 0,
  lastSpeedChange: Date.now(),
  finished: false,
  finishTime: null,
  currentSpeedKmh: "0.0",
  startTime: null,
  totalDistance: 0,
  averageSpeed: null,
  totalTime: null,
  distanceFromLeader: null,
  startLatitude: routeCoordinates[0].lat,
  startLongitude: routeCoordinates[0].lng,
  ridingStyle: Math.random(),
  recoveryRate: (Math.random() * 0.1) + 0.9,
  endurance: (Math.random() * 0.2) + 0.8,
  catchUpFactor: 1.0
}));

// Add zoom level configuration
const mapConfig = {
  zoom: 11, // More zoomed out view
  center: {
    lat: (routeCoordinates[0].lat + routeCoordinates[1].lat) / 2,
    lng: (routeCoordinates[0].lng + routeCoordinates[1].lng) / 2
  },
  mapTypeId: 'hybrid', // Changed from 'satellite' to 'hybrid' for better visibility
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  styles: [
    {
      "featureType": "all",
      "elementType": "labels",
      "stylers": [
        { "visibility": "on" }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [
        { "visibility": "on" }
      ]
    }
  ]
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
function validateCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || 
      isNaN(lat) || isNaN(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }
  return true;
}

// Function to get position along the route
function getPositionAlongRoute(progress, leg) {
  if (!routeSegments[leg] || routeSegments[leg].length === 0) {
    return { lat: routeCoordinates[0].lat, lng: routeCoordinates[0].lng };
  }

  const points = routeSegments[leg];
  const totalPoints = points.length;
  const pointIndex = Math.min(Math.floor(progress * totalPoints), totalPoints - 1);
  
  const point = points[pointIndex];
  if (!validateCoordinates(point.lat, point.lng)) {
    console.error('Invalid coordinates found in route:', point);
    return { lat: routeCoordinates[0].lat, lng: routeCoordinates[0].lng };
  }
  
  return point;
}

// Function to get location name based on coordinates and progress
function getLocationName(lat, lng, progress) {
  if (progress < 0) {
    const locations = ["Sarath City Capital Mall", "Rajiv Gandhi International Airport, Shamshabad"];
    return `Waiting at ${locations[currentLeg]}`;
  }
  
  if (progress >= 1) {
    const nextLocations = ["Rajiv Gandhi International Airport, Shamshabad"];
    return `Arrived at ${nextLocations[currentLeg]}`;
  }
  
  const currentLocation = currentLeg === 0 ? "Sarath City Capital Mall" : "Rajiv Gandhi International Airport, Shamshabad";
  const nextLocation = currentLeg === 0 ? "Rajiv Gandhi International Airport, Shamshabad" : "Sarath City Capital Mall";
  
  if (progress < 0.25) return `Leaving ${currentLocation}`;
  if (progress < 0.5) return `On the way to ${nextLocation}`;
  if (progress < 0.75) return `Approaching ${nextLocation}`;
  return `Near ${nextLocation}`;
}

// Function to get distance between two points using Google Maps Distance Matrix API
async function getDistance(origin, destination) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        key: "AIzaSyDWAVtHEH-0aA92ETZ1RuUgPpZzh4wJ4Ns",
        mode: 'driving'
      }
    });

    if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
      return response.data.rows[0].elements[0].distance.value / 1000; // Convert meters to kilometers
    }
    return null;
  } catch (error) {
    console.error('Error getting distance:', error);
    return null;
  }
}

// Function to calculate speed in km/h
function calculateSpeedKmh(speed) {
  // Convert the speed value to km/h
  // Increased base speed for more realistic cycling
  const baseSpeed = 12; // Increased from 4 to 12 km/h
  const actualSpeed = (speed * baseSpeed).toFixed(1);
  return actualSpeed;
}

// Function to update rider positions
function updateRiderPositions() {
  if (!raceInProgress) return;

  const now = Date.now();
  const timeElapsed = (now - lastUpdate) / 1000;
  lastUpdate = now;

  // Find the leader's progress
  const leaderProgress = Math.max(...riders.map(r => r.progress));
  
  riders.forEach((rider, index) => {
    if (rider.finished) return;

    // Calculate distance from leader in kilometers
    const distanceFromLeader = (leaderProgress - rider.progress) * 100;
    rider.distanceFromLeader = distanceFromLeader;

    // Adjust catch-up factor based on distance from leader
    if (distanceFromLeader > 1) {
      rider.catchUpFactor = 1 + (distanceFromLeader * 0.03);
    } else {
      rider.catchUpFactor = 1.0;
    }

    // More dynamic stamina and fatigue system
    const baseStaminaDrain = 0.01; // Increased stamina drain
    const baseFatigueGain = 0.006; // Increased fatigue gain
    
    // Adjust stamina drain based on current speed and riding style
    const speedFactor = rider.speed / 0.001; // Adjusted for new base speed
    const styleFactor = 1 + (rider.ridingStyle - 0.5) * 0.15;
    
    rider.stamina = Math.max(0, Math.min(100, 
      rider.stamina - (baseStaminaDrain * speedFactor * styleFactor * timeElapsed)
    ));
    
    // Adjust fatigue based on speed, stamina, and endurance
    const fatigueGainFactor = 1 + (1 - rider.endurance) * 0.2;
    rider.fatigue = Math.min(100, 
      rider.fatigue + (baseFatigueGain * speedFactor * fatigueGainFactor * timeElapsed)
    );

    // More frequent and impactful random events
    if (now - rider.lastSpeedChange > 3000) {
      const randomEvent = Math.random();
      
      // Boost opportunity (more likely when stamina is high and behind)
      if (randomEvent < 0.2 && !rider.boost && rider.stamina > 40 && distanceFromLeader > 0.5) {
        rider.boost = true;
        rider.boostTimer = 2 + Math.random() * 2;
        rider.speed += 0.0008 + Math.random() * 0.0004; // Increased boost effect
        rider.stamina -= 20 + Math.random() * 10;
        rider.lastSpeedChange = now;
      }
      // Random slowdown (less likely when behind)
      else if (randomEvent > 0.9 && distanceFromLeader < 0.5) {
        const slowdown = 0.0004 + Math.random() * 0.0004; // Increased slowdown effect
        rider.speed = Math.max(0.0006, rider.speed - slowdown);
        rider.lastSpeedChange = now;
      }
      // Random recovery (more likely when behind)
      else if (randomEvent > 0.7 && rider.fatigue > 30 && distanceFromLeader > 0.5) {
        rider.fatigue = Math.max(0, rider.fatigue - (8 + Math.random() * 12));
        rider.stamina = Math.min(100, rider.stamina + (8 + Math.random() * 12));
        rider.lastSpeedChange = now;
      }
    }

    // Handle boost mechanics with more variation
    if (rider.boost) {
      rider.boostTimer -= timeElapsed;
      if (rider.boostTimer <= 0) {
        rider.boost = false;
        const boostRecovery = 0.0004 + Math.random() * 0.0004; // Increased boost recovery
        rider.speed = Math.max(0.0006, rider.speed - boostRecovery);
      }
    }

    // Adjust speed based on fatigue, stamina, endurance, and catch-up factor
    const fatigueImpactFactor = 1 - (rider.fatigue / 400);
    const staminaFactor = 0.7 + (rider.stamina / 200);
    const enduranceFactor = 0.85 + (rider.endurance * 0.15);
    
    const adjustedSpeed = rider.speed * fatigueImpactFactor * staminaFactor * enduranceFactor * rider.catchUpFactor;

    // Update progress with more variation
    const progressIncrement = adjustedSpeed * timeElapsed * (0.97 + Math.random() * 0.06);
    rider.progress += progressIncrement;

    // Calculate current speed in km/h with more variation
    const currentSpeed = (adjustedSpeed * 1000) * (0.99 + Math.random() * 0.02);
    rider.currentSpeedKmh = currentSpeed.toFixed(1);

    // Handle route completion
    if (rider.progress >= 1 && !rider.finished) {
      rider.finished = true;
      rider.finishTime = now;
      rider.location = "Rajiv Gandhi International Airport";
      rider.progress = 1;
      rider.currentSpeedKmh = "0.0";
      
      if (!winner) {
        winner = rider;
        console.log(`Race completed! Winner: ${rider.name}`);
      }
      
      const allFinished = riders.every(r => r.finished);
      if (allFinished) {
        raceInProgress = false;
        raceCompleted = true;
        console.log('All riders have finished the race!');
      }
    }

    // Update position with validation
    const position = getPositionAlongRoute(rider.progress, currentLeg);
    if (validateCoordinates(position.lat, position.lng)) {
      rider.latitude = position.lat;
      rider.longitude = position.lng;
    } else {
      console.error(`Invalid position for rider ${rider.name}:`, position);
      rider.latitude = routeCoordinates[0].lat;
      rider.longitude = routeCoordinates[0].lng;
    }
    rider.lastUpdated = now;

    // Update rider positions
    if (!rider.finished) {
      const currentLeg = Math.floor(rider.progress);
      const legProgress = rider.progress - currentLeg;
      
      if (currentLeg < routeSegments.length) {
        const currentLegPoints = routeSegments[currentLeg];
        const totalPoints = currentLegPoints.length;
        const pointIndex = Math.min(Math.floor(legProgress * (totalPoints - 1)), totalPoints - 2);
        
        // Get the current segment points
        const startPoint = currentLegPoints[pointIndex];
        const endPoint = currentLegPoints[pointIndex + 1];
        
        // Calculate progress within the current segment
        const segmentProgress = (legProgress * (totalPoints - 1)) - pointIndex;
        
        // Update position with interpolation
        rider.latitude = startPoint.lat + (endPoint.lat - startPoint.lat) * segmentProgress;
        rider.longitude = startPoint.lng + (endPoint.lng - startPoint.lng) * segmentProgress;
        
        // Calculate total distance traveled
        let totalDistance = 0;
        
        // Calculate distance for completed legs
        for (let i = 0; i < currentLeg; i++) {
          const legPoints = routeSegments[i];
          for (let j = 0; j < legPoints.length - 1; j++) {
            totalDistance += calculateDistance(
              legPoints[j].lat, legPoints[j].lng,
              legPoints[j + 1].lat, legPoints[j + 1].lng
            );
          }
        }

        // Add distance for completed points in current leg
        for (let i = 0; i < pointIndex; i++) {
          totalDistance += calculateDistance(
            currentLegPoints[i].lat, currentLegPoints[i].lng,
            currentLegPoints[i + 1].lat, currentLegPoints[i + 1].lng
          );
        }

        // Add distance for current progress within the current segment
        totalDistance += calculateDistance(
          startPoint.lat, startPoint.lng,
          rider.latitude, rider.longitude
        );

        rider.totalDistance = totalDistance;
        
        // Calculate current speed
        const timeElapsed = (Date.now() - rider.startTime) / 1000 / 3600; // hours
        rider.averageSpeed = totalDistance / timeElapsed;
        
        // Calculate current speed in km/h
        rider.currentSpeedKmh = (totalDistance / timeElapsed).toFixed(1);
        
        // Check if rider has completed the route
        if (currentLeg === routeSegments.length - 1 && 
            pointIndex === totalPoints - 2 && 
            segmentProgress >= 0.99) {
          rider.finished = true;
          rider.finishTime = Date.now();
          rider.totalTime = Math.floor((rider.finishTime - rider.startTime) / 1000);
          rider.latitude = currentLegPoints[totalPoints - 1].lat;
          rider.longitude = currentLegPoints[totalPoints - 1].lng;
        }
      }
    }
  });

  // Update race positions
  riders.sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    return b.progress - a.progress;
  });

  // Update position numbers
  riders.forEach((rider, index) => {
    rider.position = index + 1;
  });
}

// Initialize routes with single route
async function initializeRoutes() {
  try {
    const mallToAirport = await getRoute(routeCoordinates[0], routeCoordinates[1]);

    if (!mallToAirport) {
      throw new Error('Failed to get route from Google Maps');
    }

    routeSegments = [mallToAirport];

    // Initialize riders with valid coordinates
    riders.forEach(rider => {
      rider.latitude = routeCoordinates[0].lat;
      rider.longitude = routeCoordinates[0].lng;
    });

  } catch (error) {
    console.error('Error initializing route:', error);
    routeSegments = [[routeCoordinates[0], routeCoordinates[1]]];
    
    riders.forEach(rider => {
      rider.latitude = routeCoordinates[0].lat;
      rider.longitude = routeCoordinates[0].lng;
    });
  }
}

// API endpoint to start the race
app.post('/api/start-race', async (req, res) => {
  if (raceInProgress) {
    return res.status(400).json({ error: 'Race is already in progress' });
  }
  
  if (raceCompleted) {
    return res.status(400).json({ error: 'Race has already been completed' });
  }

  try {
    if (routeSegments.length === 0) {
      await initializeRoutes();
    }

    raceInProgress = true;
    raceCompleted = false;
    winner = null;
    currentLeg = 0;
    lastUpdate = Date.now();
    raceStartTime = Date.now();

    riders.forEach((rider, index) => {
      rider.progress = 0;
      rider.location = 'Sarat City Capital Mall';
      rider.position = index + 1;
      rider.stamina = 100;
      rider.boost = false;
      rider.boostTimer = 0;
      rider.fatigue = 0;
      rider.lastSpeedChange = Date.now();
      rider.finished = false;
      rider.finishTime = null;
      rider.latitude = routeCoordinates[0].lat;
      rider.longitude = routeCoordinates[0].lng;
      rider.currentSpeedKmh = "0.0";
    });

    res.json({ message: 'Race started successfully' });
  } catch (error) {
    console.error('Error starting race:', error);
    res.status(500).json({ error: 'Failed to start race' });
  }
});

// API endpoint to restart the race
app.post('/api/restart-race', async (req, res) => {
  try {
    if (routeSegments.length === 0) {
      await initializeRoutes();
    }

    raceInProgress = false;
    raceCompleted = false;
    winner = null;
    currentLeg = 0;
    lastUpdate = Date.now();
    raceStartTime = null;

    riders.forEach((rider, index) => {
      rider.progress = 0;
      rider.location = 'Sarat City Capital Mall';
      rider.position = index + 1;
      rider.stamina = 100;
      rider.boost = false;
      rider.boostTimer = 0;
      rider.fatigue = 0;
      rider.lastSpeedChange = Date.now();
      rider.finished = false;
      rider.finishTime = null;
      rider.latitude = routeCoordinates[0].lat;
      rider.longitude = routeCoordinates[0].lng;
      rider.currentSpeedKmh = "0.0";
    });

    updateRiderPositions();

    res.json({ 
      message: 'Race reset successfully',
      riders: riders.map(rider => ({
        id: rider.id,
        name: rider.name,
        latitude: rider.latitude,
        longitude: rider.longitude,
        location: rider.location,
        position: rider.position,
        finished: rider.finished,
        speedKmh: rider.currentSpeedKmh
      }))
    });
  } catch (error) {
    console.error('Error restarting race:', error);
    res.status(500).json({ error: 'Failed to restart race' });
  }
});

// API endpoint to get rider locations
app.get('/api/riders', (req, res) => {
  // Ensure riders have valid coordinates
  riders.forEach(rider => {
    if (!validateCoordinates(rider.latitude, rider.longitude)) {
      console.error(`Invalid coordinates for rider ${rider.name}:`, rider.latitude, rider.longitude);
      rider.latitude = routeCoordinates[0].lat;
      rider.longitude = routeCoordinates[0].lng;
    }
  });

  updateRiderPositions();
  
  const riderData = riders.map(rider => ({
    id: rider.id,
    name: rider.name,
    latitude: rider.latitude,
    longitude: rider.longitude,
    location: rider.location,
    position: rider.position,
    finished: rider.finished,
    speedKmh: rider.currentSpeedKmh,
    lastUpdated: new Date(rider.lastUpdated).toISOString(),
    totalDistance: rider.totalDistance,
    averageSpeed: rider.averageSpeed,
    totalTime: rider.totalTime
  }));
  
  res.json({
    riders: riderData,
    raceCompleted,
    raceInProgress,
    winner: winner ? {
      name: winner.name,
      finishTime: new Date(winner.finishTime).toISOString(),
      raceDuration: ((winner.finishTime - raceStartTime) / 1000).toFixed(2) + " seconds"
    } : null,
    mapConfig // Include map configuration in the response
  });
});

// Update the race configuration endpoint
app.put('/api/race-config', (req, res) => {
  try {
    const { baseSpeed, staminaDrain, fatigueRate } = req.body || {};
    
    // Update global race parameters
    if (baseSpeed !== undefined) {
      riders.forEach(rider => {
        rider.speed = baseSpeed + (parseInt(rider.id.replace('rider', '')) * 0.002);
      });
    }
    
    res.json({ 
      message: 'Race configuration updated successfully',
      config: { baseSpeed, staminaDrain, fatigueRate }
    });
  } catch (error) {
    console.error('Error updating race config:', error);
    res.status(500).json({ error: 'Failed to update race configuration' });
  }
});

// Update the rider configuration endpoint to handle adding, updating, and deleting riders
app.put('/api/riders/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Handle delete operation
  if (updates.action === 'delete') {
    const riderIndex = riders.findIndex(r => r.id === id);
    if (riderIndex === -1) {
      return res.status(404).json({ error: 'Rider not found' });
    }
    
    if (raceInProgress) {
      return res.status(400).json({ error: 'Cannot delete rider during race' });
    }
    
    riders.splice(riderIndex, 1);
    return res.json({ message: 'Rider deleted successfully' });
  }
  
  // Handle add operation
  if (updates.action === 'add') {
    if (raceInProgress) {
      return res.status(400).json({ error: 'Cannot add rider during race' });
    }
    
    const newRider = {
      id: `rider${riders.length + 1}`,
      name: updates.name || `Rider ${riders.length + 1}`,
      latitude: routeCoordinates[0].lat,
      longitude: routeCoordinates[0].lng,
      speed: (Math.random() * 0.002) + 0.001,
      progress: 0,
      location: 'Sarath City Capital Mall',
      lastUpdated: Date.now(),
      position: riders.length + 1,
      stamina: 100,
      boost: false,
      boostTimer: 0,
      fatigue: 0,
      lastSpeedChange: Date.now(),
      finished: false,
      finishTime: null,
      currentSpeedKmh: "0.0",
      startTime: null,
      totalDistance: 0,
      averageSpeed: null,
      totalTime: null,
      distanceFromLeader: null,
      startLatitude: routeCoordinates[0].lat,
      startLongitude: routeCoordinates[0].lng,
      ridingStyle: Math.random(),
      recoveryRate: (Math.random() * 0.1) + 0.9,
      endurance: (Math.random() * 0.2) + 0.8,
      catchUpFactor: 1.0
    };
    
    riders.push(newRider);
    return res.json(newRider);
  }
  
  // Handle update operation
  const riderIndex = riders.findIndex(r => r.id === id);
  if (riderIndex === -1) {
    return res.status(404).json({ error: 'Rider not found' });
  }

  // Update only allowed fields
  const allowedFields = ['name', 'speed', 'stamina', 'fatigue', 'endurance', 'recoveryRate'];
  const updatedRider = { ...riders[riderIndex] };
  
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      updatedRider[field] = updates[field];
    }
  });

  // Update the rider in the array
  riders[riderIndex] = updatedRider;

  res.json(updatedRider);
});

// Randomize rider positions
app.put('/api/ridersrandomize', (req, res) => {
  if (raceInProgress) {
    return res.status(400).json({ error: 'Cannot randomize during race' });
  }

  const centerLat = routeCoordinates[0].lat;
  const centerLng = routeCoordinates[0].lng;
  const maxOffset = 0.009;

  riders.forEach(rider => {
    const latOffset = (Math.random() - 0.5) * maxOffset;
    const lngOffset = (Math.random() - 0.5) * maxOffset;

    rider.latitude = centerLat + latOffset;
    rider.longitude = centerLng + lngOffset;
    
    rider.progress = 0;
    rider.position = 1;
    rider.finished = false;
    rider.startTime = null;
    rider.finishTime = null;
    rider.totalTime = null;
    rider.averageSpeed = null;
    rider.totalDistance = 0;
    rider.distanceFromLeader = null;
    rider.currentSpeedKmh = "0.0";
  });

  res.json({ 
    message: 'Rider positions randomized',
    riders: riders.map(rider => ({
      id: rider.id,
      name: rider.name,
      latitude: rider.latitude,
      longitude: rider.longitude,
      position: rider.position,
      finished: rider.finished,
      speedKmh: rider.currentSpeedKmh,
      totalDistance: rider.totalDistance,
      averageSpeed: rider.averageSpeed,
      totalTime: rider.totalTime
    }))
  });
});

// Initialize routes and start server
async function startServer() {
  try {
    await initializeRoutes();
    const PORT = 3001;
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        require('child_process').exec(`lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (error) => {
          if (error) {
            console.error('Error killing process:', error);
            process.exit(1);
          }
          server.listen(PORT);
        });
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 
