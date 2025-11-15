# MedVoy AI Backend

Medical tourism platform backend providing transparent cost estimates and hospital matching for international medical procedures.

## 🚀 Features

- **Cost Estimation**: Detailed cost breakdowns for medical procedures across multiple countries
- **Hospital Matching**: AI-powered hospital recommendations based on procedure and location
- **Multi-factor Pricing**: Considers procedure fees, flight costs, accommodation, and local transport
- **Comprehensive Database**: Pre-loaded with real hospital, flight, and accommodation data

## 📊 API Endpoints

### POST /api/estimate
Calculate cost estimate for a medical procedure

**Request Body:**
```json
{
  "procedure": "Heart Bypass Surgery",
  "country": "Thailand",
  "travelDate": "2024-06-15",
  "budget": "50000",
  "companions": 1,
  "hotelType": "standard"
}
```

**Response:**
```json
{
  "estimateLow": 28000,
  "estimateHigh": 45000,
  "breakdown": {
    "procedureFee": { "low": 24000, "high": 36000 },
    "hospitalFee": { "low": 9600, "high": 14400 },
    "surgeonFee": { "low": 14400, "high": 21600 },
    "flight": { "low": 800, "high": 1500 },
    "hotel": { "low": 420, "high": 840 },
    "transport": { "low": 200, "high": 500 }
  },
  "recommendations": [
    {
      "hospital": "Bumrungrad International Hospital",
      "country": "Thailand",
      "reason": "Top-rated hospital with 4.8/5.0 rating, specializes in Heart Bypass Surgery",
      "accreditation": "JCI Accredited"
    }
  ]
}
```

### GET /api/estimate/procedures
Get list of available medical procedures

### GET /api/estimate/hospitals?country=Thailand
Get hospitals available in a specific country

### GET /api/estimate/history
Get recent estimation requests

### GET /health
Health check endpoint

## 🏥 Database Schema

### Procedures
- Medical procedures with base costs and recommended countries

### Hospitals  
- Hospital information including accreditation, ratings, and specialties

### Flights
- Flight cost data from major US cities to destination countries

### Hotels
- Accommodation costs by country and hotel type

### UserIntakes
- All estimation requests and responses

## 🛠️ Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite3** - Database
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection

## 📦 Installation

```bash
# Clone repository
git clone <repository-url>
cd medvoy-backend

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 🔧 Configuration

Environment variables in `.env`:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DB_PATH` - SQLite database file path
- `CORS_ORIGIN` - Allowed CORS origins

## 📈 Supported Procedures

- Heart Bypass Surgery
- Knee Replacement
- Hip Replacement
- Dental Implants
- IVF Treatment
- Cosmetic Surgery
- Cancer Treatment
- Spine Surgery

## 🌍 Supported Countries

- Thailand
- India
- Turkey
- Mexico

## 🔒 Security

- Helmet.js for security headers
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- Error handling and logging

## 🚀 Deployment

The application is ready for deployment to:
- Heroku
- Render
- Vercel
- AWS
- DigitalOcean

## 📝 API Usage

```bash
# Example curl request
curl -X POST http://localhost:3000/api/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "procedure": "Knee Replacement",
    "country": "Thailand",
    "companions": 1,
    "hotelType": "standard"
  }'
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details