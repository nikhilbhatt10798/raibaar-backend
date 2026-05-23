# Renbasera Backend API

A comprehensive Node.js/Express backend API for the Renbasera village homestays platform with complete payment processing.

## Features

- **User Authentication**: JWT-based authentication with role-based access
- **Property Management**: Complete CRUD operations with advanced search and filtering
- **Booking System**: Full booking lifecycle with availability management
- **Review System**: Guest reviews with ratings and photos
- **Host Profiles**: Comprehensive host management with verification
- **Payment Processing**: Complete Razorpay integration with GST calculations
- **Host Earnings**: Wallet system with withdrawal management
- **File Uploads**: Image and video uploads for properties (up to 250MB photos, 50MB videos)
- **Notifications System**: Real-time user notifications with read/unread status
- **Real-time Updates**: Redis-based caching and job processing

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcrypt
- **Validation**: Zod
- **Payment**: Razorpay with GST calculations
- **File Storage**: Multer for image uploads
- **Caching**: Redis for session and job management
- **Job Processing**: Bull queues with node-cron
- **CORS**: Configured for frontend integration

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
   - `RAZORPAY_KEY_ID`: Razorpay API key
   - `RAZORPAY_KEY_SECRET`: Razorpay secret key
   - `RAZORPAY_WEBHOOK_SECRET`: Razorpay webhook secret
   - `REDIS_HOST`: Redis server host (optional)
   - `REDIS_PORT`: Redis server port (optional)

4. **Start MongoDB** (if using local instance)
   ```bash
   mongod
   ```

5. **Start Redis** (optional, for caching and job queues)
   ```bash
   redis-server
   ```

6. **Seed initial data** (optional)
   ```bash
   npm run seed
   ```

7. **Run development server**
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

### Payments
- `POST /api/payments/create` - Create payment order
- `POST /api/payments/verify` - Verify payment status
- `GET /api/payments/details/:bookingId` - Get payment details
- `POST /api/payments/callback` - Razorpay webhook endpoint
- `GET /api/payments/refund/status/:paymentId` - Check refund status

### Host Earnings
- `GET /api/payments/earnings/:hostId` - Get host earnings
- `POST /api/payments/withdrawal/request/:hostId` - Request withdrawal
- `GET /api/payments/withdrawal/history/:hostId` - Withdrawal history
- `POST /api/payments/bank-account/:hostId` - Update bank account
- `GET /api/payments/income-statement/:hostId` - Generate income statement

### Admin Operations
- `POST /api/payments/admin/handle-stuck` - Handle stuck payments
- `POST /api/payments/admin/process-pending-refunds` - Process refunds
- `POST /api/payments/admin/reconcile` - Daily reconciliation

### Notifications
- `GET /api/notifications` - Get user notifications (protected)
- `PUT /api/notifications/:notificationId/read` - Mark notification as read (protected)
- `PUT /api/notifications/mark-all-read` - Mark all notifications as read (protected)
- `DELETE /api/notifications/:notificationId` - Delete notification (protected)
- `POST /api/notifications` - Create notification (protected, admin/system use)

### Content & Testimonials
- `GET /api/content` - Get static content
- `GET /api/testimonials` - Get testimonials
- `POST /api/testimonials` - Submit testimonial

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/renbasera
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
API_BASE_URL=http://localhost:5000

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
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
- email, password (hashed), firstName, lastName, phone, role, isVerified, timestamps

### HostProfile
- userId, bio, village, district, state, yearsHosting, verified, averageRating, bankAccount

### Property
- title, description, location, price, images, amenities, houseRules, hostId, featured, available, blockedDates

### Booking
- propertyId, userId, hostId, checkIn, checkOut, guests, pricing, status, specialRequests

### Review
- propertyId, userId, rating, comment, photos, timestamps

### Payment
- bookingId, userId, amount, currency, method, status, transactionId, razorpayOrderId, gstBreakdown

### HostWallet
- hostId, balance, totalEarnings, totalWithdrawn, lastUpdated

### Withdrawal
- hostId, amount, status, bankAccount, processedAt, createdAt

### Testimonial
- userId, name, avatar, location, quote, rating, approved

## Key Features Implemented

✅ **Complete Authentication System**
- JWT-based authentication with role-based access control
- Password hashing with bcrypt
- Protected routes with middleware

✅ **Property Management**
- Full CRUD operations for properties
- Advanced search and filtering
- Image upload functionality
- Featured properties system

✅ **Booking System**
- Complete booking lifecycle management
- Availability checking and date blocking
- Booking status tracking
- Cancellation support

✅ **Payment Processing**
- Full Razorpay integration
- GST calculations (18% on room and platform charges)
- Platform service charges (5%)
- Escrow-like payment holds
- Automatic payment failure handling
- Host wallet system

✅ **Host Earnings Management**
- Wallet system for tracking earnings
- Withdrawal request processing
- Bank account management
- Monthly income statements
- Earnings breakdown with GST details

✅ **Review System**
- Guest reviews with ratings
- Photo uploads in reviews
- Property average rating calculations

✅ **File Upload System**
- Multer-based image uploads
- Property and review image support
- File validation and storage management

✅ **Advanced Features**
- Redis caching and job queues
- Scheduled payment reconciliation
- Webhook integration for real-time updates
- Comprehensive error handling
- Input validation with Zod

## Next Steps

- Email notifications system
- Real-time chat between guests and hosts
- Advanced analytics dashboard
- Mobile app API endpoints
- Multi-language support
- Advanced search with map integration

## License

MIT
