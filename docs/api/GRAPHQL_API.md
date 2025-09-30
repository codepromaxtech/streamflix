# GraphQL API Reference

This document provides a reference for the streaming platform's GraphQL API.

## Base URL

```
http://localhost:4000/graphql
```

## Authentication

All GraphQL operations require authentication using JWT tokens.

### Headers

```
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

## Queries

### Get Current User

```graphql
query GetCurrentUser {
  me {
    id
    email
    name
    role
    createdAt
  }
}
```

### Get Content

```graphql
query GetContent($id: ID!) {
  content(id: $id) {
    id
    title
    description
    duration
    releaseDate
    thumbnailUrl
    videoUrl
    genres
    rating
  }
}
```

### Search Content

```graphql
query SearchContent($query: String!, $page: Int, $limit: Int) {
  search(query: $query, page: $page, limit: $limit) {
    data {
      id
      title
      description
      thumbnailUrl
    }
    meta {
      total
      page
      limit
      totalPages
    }
  }
}
```

## Mutations

### Login

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    access_token
    user {
      id
      email
      name
      role
    }
  }
}
```

**Variables:**

```json
{
  "input": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

### Register

```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    id
    email
    name
    role
  }
}
```

**Variables:**

```json
{
  "input": {
    "email": "newuser@example.com",
    "name": "New User",
    "password": "securepassword123"
  }
}
```

## Subscriptions

### Content Added

```graphql
subscription OnContentAdded {
  contentAdded {
    id
    title
    description
    thumbnailUrl
    createdAt
  }
}
```

## Error Responses

GraphQL errors will be returned in the following format:

```json
{
  "errors": [
    {
      "message": "Error message",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": ["queryName"],
      "extensions": {
        "code": "UNAUTHENTICATED",
        "exception": {
          "stacktrace": ["..."]
        }
      }
    }
  ],
  "data": null
}
```

## Common Error Codes

| Code              | Description                     |
|-------------------|---------------------------------|
| UNAUTHENTICATED   | Authentication required         |
| FORBIDDEN         | Insufficient permissions        |
| BAD_USER_INPUT    | Invalid input data              |
| INTERNAL_ERROR    | Server error                    |
| NOT_FOUND         | Resource not found              |

## Introspection

You can explore the full schema using GraphQL introspection:

```graphql
query IntrospectionQuery {
  __schema {
    types {
      name
      kind
      description
      fields {
        name
        type {
          name
          kind
          ofType {
            name
            kind
          }
        }
      }
    }
  }
}
```
