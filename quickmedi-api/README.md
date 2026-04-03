# QuickMedi Backend API

Complete Node.js backend for QuickMedi medicine platform with AI-powered prescription processing, real-time order tracking, and emergency alert system.

## 🚀 Tech Stack

- **Runtime**: Node.js 18+ with ES Modules
- **Framework**: Express.js 4.19  
- **Database**: MongoDB 6.0+ (NO Redis)
- **Real-time**: Socket.io 4.6 with JWT auth
- **Authentication**: JWT + OTP (Twilio)
- **File Upload**: Multer + Sharp + Cloudinary
- **Payments**: Stripe 14.0
- **Push Notifications**: Firebase Admin SDK 12.0
- **AI Service**: Python FastAPI (localhost:8000)
- **Job Scheduler**: node-cron 3.0

## 🔧 Installation

```bash
cd quickmedi-api
npm install
cp .env.example .env
# Configure .env file
```

## 🚀 Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/register/patient` - Register patient
- `POST /api/auth/register/vendor` - Register pharmacy
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Prescription (AI-Powered)
- `POST /api/prescription/upload` - Upload prescription with AI processing
- `GET /api/prescription/history` - Get prescription history
- `GET /api/prescription/:id` - Get details

### Order & Payment
- `POST /api/order/create` - Create order
- `POST /api/order/payment/create-intent` - Create payment
- `POST /api/order/payment/confirm` - Confirm payment
- `POST /api/order/payment/webhook` - Stripe webhook
- `GET /api/order/:id/track` - Track order

### Emergency
- `POST /api/emergency/trigger` - Trigger emergency alert
- `GET /api/emergency/:id/status` - Get status

### Chatbot
- `POST /api/chatbot/message` - Send message to AI
- `GET /api/chatbot/sessions` - List sessions

## 🤖 AI Integration

Connects to Python FastAPI service (localhost:8000):
- OCR prescription processing
- Medicine alternatives
- Drug interaction checking
- Safety analysis
- Multilingual chatbot

## 🔐 Authentication Flow

1. Send OTP → MongoDB storage (bcrypt, TTL index)
2. Verify OTP → Returns tempToken or accessToken
3. Complete registration with tempToken
4. Access API with accessToken (15min)
5. Refresh tokens with refreshToken (30d)
6. Logout → Sets lastLogoutAt, invalidates all tokens

## 🔒 Security

- Helmet.js security headers
- CORS configured for frontend only
- Rate limiting with MemoryStore (NO Redis)
- JWT with separate secrets
- Bcrypt password/OTP hashing
- Input validation with Joi
- Token blacklist via lastLogoutAt field

## 📦 Features Implemented

✅ OTP authentication with MongoDB TTL  
✅ Patient dashboard with geospatial queries  
✅ AI prescription processing (async with Socket.io notifications)  
✅ Medicine search with text indexing  
✅ Nearby pharmacy search (2dsphere)  
✅ Order management with Stripe payments  
✅ Emergency alert system  
✅ AI chatbot (multilingual)  
✅ Real-time notifications (Socket.io + Firebase)  

## 🚧 Pending

- Reminder system with cron jobs
- Subscription management
- Vendor dashboard
- Admin approval panel
- Background jobs

## 📝 Code Conventions

- ES Modules (import/export)
- Async/await with asyncHandler wrapper
- ApiError for HTTP errors
- ApiResponse for consistency
- Services for business logic
- MongoDB Only (NO Redis)

## Status

**Core features complete!** Auth, Prescription AI, Orders, Emergency, Chatbot all working.

---

**Built for QuickMedi Hackathon**
