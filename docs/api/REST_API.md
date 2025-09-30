# REST API Reference

This document provides a reference for the streaming platform's REST API.

## Base URL

```
http://localhost:4000/api
```

## Authentication

All API endpoints require authentication using JWT tokens.

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

## Endpoints

### Authentication

#### Login

```http
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

### Users

#### Get Current User

```http
GET /users/me
```

**Response:**

```json
{
  "id": "1",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

### Content

#### Get All Content

```http
GET /content
```

**Query Parameters:**

| Parameter | Type    | Description                 |
|-----------|---------|-----------------------------|
| page      | integer | Page number (default: 1)    |
| limit     | integer | Items per page (default: 10)|
| search    | string  | Search term                 |
| genre     | string  | Filter by genre             |

**Response:**

```json
{
  "data": [
    {
      "id": "1",
      "title": "Sample Movie",
      "description": "A great movie",
      "duration": 120,
      "releaseDate": "2023-01-01",
      "thumbnailUrl": "https://example.com/thumbnail.jpg",
      "videoUrl": "https://example.com/video.mp4"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": ["Error message 1", "Error message 2"],
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```
