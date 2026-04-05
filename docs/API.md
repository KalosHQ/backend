# Kalos Backend API Documentation

## Base URL

```
Development: http://localhost:4000
Production: https://api.kalos.app
```

All endpoints are versioned. Current version: **v1**

## Authentication

Most endpoints require authentication using JWT tokens.

### Headers

```
Authorization: Bearer <access_token>
```

### Token Refresh

Access tokens expire after 15 minutes. Use refresh tokens to get new access tokens.

---

## 🔐 Authentication Endpoints

### Register

Create a short-lived init token for registration.

```http
POST /v1/auth/register/init
```

**Request Body:**

```json
{
  "deviceId": "device-unique-id"
}
```

**Response:** `201 Created`

```json
{
  "token": "jwt-init-token",
  "flow": "register",
  "expiresInSeconds": 300
}
```

---

### Register Account

Create a user account and send OTP to the user's email.

```http
POST /v1/auth/register
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "displayName": "John Doe",
  "deviceId": "device-unique-id",
  "initToken": "jwt-init-token"
}
```

**Response:** `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "USER",
    "isVerified": false
  },
  "requiresOtpVerification": true,
  "otpExpiresInSeconds": 600,
  "message": "Registration successful. We sent a verification OTP to your email."
}
```

---

### Login

Create a short-lived init token for login.

```http
POST /v1/auth/login/init
```

**Request Body:**

```json
{
  "deviceId": "device-unique-id"
}
```

**Response:** `201 Created`

```json
{
  "token": "jwt-init-token",
  "flow": "login",
  "expiresInSeconds": 300
}
```

---

### Login Account

Authenticate with email/phone and password (verified accounts only).

```http
POST /v1/auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "deviceId": "device-unique-id",
  "initToken": "jwt-init-token"
}
```

**Response:** `201 Created`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "USER",
    "isVerified": true
  }
}
```

**Errors:**

- `401 Unauthorized` - Invalid credentials
- `401 Unauthorized` - Account not verified
- `400 Bad Request` - Validation error

---

### Resend OTP

Resend account verification OTP.

```http
POST /v1/auth/resend-otp
```

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

---

### Verify OTP

Verify registration OTP and activate the account.

```http
POST /v1/auth/verify-otp
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

---

### Refresh Token

Get a new access token using refresh token.

```http
POST /v1/auth/refresh
```

**Headers:**

```
Authorization: Bearer <refresh_token>
```

**Response:** `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Logout

Invalidate current refresh token.

```http
POST /v1/auth/logout
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

---

### Google OAuth

Initiate Google OAuth flow.

```http
GET /v1/auth/google
```

Redirects to Google OAuth consent screen.

**Callback:**

```http
GET /v1/auth/google/callback
```

---

### Facebook OAuth

Initiate Facebook OAuth flow.

```http
GET /v1/auth/facebook
```

Redirects to Facebook login.

**Callback:**

```http
GET /v1/auth/facebook/callback
```

---

## 👤 User Endpoints

### Get Current User Profile

Get authenticated user's profile.

```http
GET /v1/users/profile
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "phone": "+1234567890",
  "displayName": "John Doe",
  "profilePicture": "https://...",
  "role": "USER",
  "isVerified": true,
  "wardrobeUploaded": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Update Profile

Update user profile information.

```http
PATCH /v1/users/profile
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "displayName": "Jane Doe",
  "phone": "+1234567890"
}
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "Jane Doe",
  "phone": "+1234567890"
}
```

---

### Get User by ID (Admin Only)

```http
GET /v1/users/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "role": "USER"
}
```

**Errors:**

- `403 Forbidden` - Not admin
- `404 Not Found` - User not found

---

## ✅ Verification Endpoints

### Submit Verification Request

Submit a request to become a Creator or Vendor.

```http
POST /v1/verification/request
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "type": "CREATOR", // or "VENDOR"
  "payload": {
    "businessName": "My Business",
    "description": "...",
    "socialLinks": ["https://instagram.com/..."]
  },
  "attachments": [
    {
      "filename": "id.jpg",
      "path": "uploads/id.jpg",
      "mimeType": "image/jpeg"
    }
  ]
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "userId": "uuid",
  "type": "CREATOR",
  "status": "PENDING",
  "submittedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Get My Verification Requests

Get current user's verification requests.

```http
GET /v1/verification/requests
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "type": "CREATOR",
    "status": "PENDING",
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "reviewedAt": null,
    "reviewNotes": null
  }
]
```

---

### Get Pending Requests (Admin Only)

Get all pending verification requests.

```http
GET /v1/verification/admin/pending
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `type` (optional): Filter by CREATOR or VENDOR
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "displayName": "John Doe"
      },
      "type": "CREATOR",
      "status": "PENDING",
      "submittedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

---

### Review Verification Request (Admin Only)

Approve or reject a verification request.

```http
PATCH /v1/verification/admin/:id
```

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "status": "APPROVED", // or "REJECTED"
  "reviewNotes": "All documents verified"
}
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "status": "APPROVED",
  "reviewedAt": "2024-01-01T00:00:00.000Z",
  "reviewNotes": "All documents verified"
}
```

**Errors:**

- `403 Forbidden` - Not admin
- `404 Not Found` - Request not found

---

## 📊 Response Formats

### Success Response

```json
{
  "id": "uuid",
  "field": "value"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Paginated Response

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🔒 Authorization

### Roles

- `USER` - Regular user
- `CREATOR` - Verified content creator
- `VENDOR` - Verified vendor
- `ADMIN` - System administrator

### Guards

Endpoints may require:

- **Authentication**: Valid JWT token
- **Role**: Specific role (e.g., ADMIN)
- **Verification**: User must be verified

---

## 📝 HTTP Status Codes

- `200 OK` - Successful GET, PATCH, PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `500 Internal Server Error` - Server error

---

## 🧪 Testing with cURL

### Register

```bash
curl -X POST http://localhost:4000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "displayName": "Test User"
  }'
```

### Login

```bash
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Profile

```bash
curl -X GET http://localhost:4000/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🔮 Future Enhancements

### Planned Features

- [ ] Swagger/OpenAPI interactive documentation
- [ ] Rate limiting headers
- [ ] Webhook endpoints
- [ ] Real-time WebSocket API
- [ ] GraphQL endpoint

### Coming Soon

- Style preferences API
- Wardrobe management API
- Outfit recommendations API
- Social features API

---

## 📚 Additional Resources

- **Postman Collection**: Import `postman_collection.json` (coming soon)
- **OpenAPI Spec**: See `openapi.yaml` (coming soon)
- **Code Examples**: Check `/docs/examples`

---

For questions or API support, contact the team! 🚀
