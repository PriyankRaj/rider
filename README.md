# Rider Tracker React App

A React application that displays multiple riders' locations on a Google Map.

## Setup Instructions

1. Install Node.js and npm
2. Clone this repository
3. Install dependencies:
   ```bash
   npm install
   ```
4. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `src/App.js` with your Google Maps API key
5. Start the backend server:
   ```bash
   npm run server
   ```
6. In a new terminal, start the development server:
   ```bash
   npm start
   ```

## API Response Format
The API returns a JSON array of 4 rider objects with random locations in the following format:
```json
[
  {
    "id": "rider1",
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  {
    "id": "rider2",
    "latitude": 37.7833,
    "longitude": -122.4167
  },
  {
    "id": "rider3",
    "latitude": 37.7750,
    "longitude": -122.4184
  },
  {
    "id": "rider4",
    "latitude": 37.7844,
    "longitude": -122.4157
  }
]
```

## Features
- Real-time display of 4 riders on the map
- Info windows showing rider details when markers are clicked
- Automatic refresh every 30 seconds
- Manual refresh button
- Error handling and display
- Responsive design

## Dependencies
- React
- @react-google-maps/api
- Axios
- Express.js (for the test backend)
- CORS (for the test backend)

## Building for Production
To create a production build:
```bash
npm run build
```
