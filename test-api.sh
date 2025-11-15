#!/bin/bash

# Install dependencies
npm install

# Start the server in background
npm start &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Test the API endpoints
echo "🧪 Testing API endpoints..."

echo "1. Testing health check..."
curl -X GET http://localhost:3000/health

echo -e "\n\n2. Testing available procedures..."
curl -X GET http://localhost:3000/api/estimate/procedures

echo -e "\n\n3. Testing cost estimate..."
curl -X POST http://localhost:3000/api/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "procedure": "Knee Replacement",
    "country": "Thailand",
    "travelDate": "2024-06-15",
    "budget": "30000",
    "companions": 1,
    "hotelType": "standard"
  }'

echo -e "\n\n4. Testing hospitals by country..."
curl -X GET "http://localhost:3000/api/estimate/hospitals?country=Thailand"

echo -e "\n\n✅ API tests completed!"

# Stop the server
kill $SERVER_PID
echo "🛑 Server stopped"