# Raibaar Backend API

A Node.js/Express backend API for the Raibaar village homestays platform.

## Features

- User authentication (JWT-based)
- Property listings and search with filtering
- Booking management
- Review system
- Host profiles
- Payment preparation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **Validation**: Zod

## Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your secret key for JWT
   - `PORT`: Server port (default: 5000)
   - `CORS_ORIGIN`: Frontend URL for CORS

4. **Start MongoDB** (if using local instance)
   ```bash
   mongod
   ```

5. **Seed initial data** (optional)
   ```bash
   npm run seed
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

Server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Properties
- `GET /api/properties` - Get all properties (with filters)
- `GET /api/properties/featured` - Get featured properties
- `GET /api/properties/:id` - Get property details
- `GET /api/properties/:id/reviews` - Get property reviews
- `POST /api/properties` - Create property (protected)
- `PUT /api/properties/:id` - Update property (protected)

### Bookings
- `GET /api/bookings` - Get user bookings (protected)
- `GET /api/bookings/:id` - Get booking details (protected)
- `POST /api/bookings` - Create booking (protected)
- `PUT /api/bookings/:id/status` - Update booking status (protected)
- `PUT /api/bookings/:id/cancel` - Cancel booking (protected)
- `GET /api/bookings/reviews` - Get reviews
- `POST /api/bookings/reviews` - Create review (protected)

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/raibaar
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
API_BASE_URL=http://localhost:5000
```

## Request Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Properties
```bash
GET /api/properties?location=Munsiyari&minPrice=1000&maxPrice=3000&sortBy=rating
```

### Create Booking
```bash
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "propertyId": "property_id",
  "checkIn": "2024-01-15T00:00:00Z",
  "checkOut": "2024-01-20T00:00:00Z",
  "guests": 2,
  "specialRequests": "Early check-in if possible"
}
```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── controllers/      # Route handlers
├── models/           # MongoDB schemas
├── routes/           # API routes
├── middleware/       # Express middleware
├── utils/            # Helper functions
├── index.ts          # Server entry point
└── seed.ts           # Database seeding script
```

## Database Schema

### User
- email, password, firstName, lastName, phone, role, isVerified

### HostProfile
- userId, bio, village, district, verified, yearsHosting, bankAccount

### Property
- title, description, location, price, images, amenities, hostId, featured

### Booking
- propertyId, userId, hostId, checkIn, checkOut, guests, pricing, status

### Review
- propertyId, userId, rating, comment, photos

### Payment
- bookingId, userId, amount, method, status, transactionId

## Future Enhancements

- Razorpay payment integration
- Email notifications
- Admin dashboard
- Availability calendar
- Advanced search filters
- User profiles
- Wishlist feature

## License

MIT
