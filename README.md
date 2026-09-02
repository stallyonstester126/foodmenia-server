# Foodmenia Backend — Phase 1 (Foundation, Auth, Users & Settings)

Production-grade Node.js + Express + MySQL backend for the Foodmenia food delivery application.

---

## Architecture & Design Pattern

Layered architecture with strict separation of concerns:
- **Routes (`*.routes.js`)**: Defines route paths, attaches rate limiters, schema validators, and auth middlewares.
- **Controllers (`*.controller.js`)**: Handles HTTP request and response parsing using `ApiResponse` and `asyncHandler`.
- **Services (`*.service.js`)**: Contains core business logic, token generation, transactions, password hashing.
- **Repositories (`*.repository.js`)**: Encapsulates raw SQL and Knex query building. Controllers never touch SQL directly.
- **Validators (`*.validation.js`)**: Joi schemas for request body, params, and query validation.

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MySQL Server (v8+)

### 2. Environment Configuration
Copy `.env.example` to `.env` and update your database credentials:
```bash
cp .env.example .env
```

### 3. Database Migrations
Create your database in MySQL (`CREATE DATABASE foodmenia;`), then run the Knex migrations:
```bash
npm run migrate
```
To rollback migrations:
```bash
npm run migrate:rollback
```

### 4. Running the Server & Documentation
```bash
# Development mode (auto-reloads with nodemon)
npm run dev

# Run automated integration test suite (Jest + Supertest)
npm test

# Production mode
npm start
```

### 5. Interactive Swagger API Docs
Access the interactive OpenAPI Swagger UI at:
- `http://localhost:5000/docs`
- `http://localhost:5000/api-docs`

### 6. Docker Deployment
```bash
# Start MySQL 8 and Foodmenia backend containers
docker compose up --build -d
```

---

## API Endpoints Overview

### Health Check
- `GET /health` — Check server status & environment.

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Register a new user (`name`, `email`, `password`, `phone`).
- `POST /api/v1/auth/login` — Login with email and password (returns JWT access & refresh tokens).
- `POST /api/v1/auth/refresh-token` — Issue a new access token via valid `refreshToken`.
- `POST /api/v1/auth/logout` — Logout (authenticated).
- `POST /api/v1/auth/forgot-password` — Generate a password reset token for `email`.
- `POST /api/v1/auth/reset-password` — Reset password using `token` and `newPassword`.

### User & Addresses (`/api/v1/users`)
- `GET /api/v1/users/me` — Get authenticated user's profile.
- `PATCH /api/v1/users/me` — Update user profile fields (`name`, `email`, `phone`, `avatar_url`).
- `GET /api/v1/users/addresses` — Get all saved addresses for the user.
- `POST /api/v1/users/addresses` — Add a new address (`label`, `full_address`, `lat`, `lng`, `city`, `country`, `is_default`).
- `PATCH /api/v1/users/addresses/:id` — Update an existing address.
- `DELETE /api/v1/users/addresses/:id` — Delete an address.
- `PATCH /api/v1/users/addresses/:id/default` — Set an address as default.

### Restaurants & Cuisines (`/api/v1/restaurants`, `/api/v1/cuisines`)
- `GET /api/v1/cuisines` — Get list of all available cuisines.
- `GET /api/v1/restaurants?cuisine=&search=&sort=&page=&limit=` — Filterable and paginated restaurants list (sort by `rating`, `delivery_time`, `name`, `newest`).
- `GET /api/v1/restaurants/:id` — Full restaurant details with associated cuisines and menu categories.
- `GET /api/v1/restaurants/:id/menu?category=` — Restaurant menu items grouped/filtered by category.

### Menu Items (`/api/v1/menu-items`)
- `GET /api/v1/menu-items/:id` — Complete product details with add-on groups, selectable add-on options, and "frequently bought together" related items.

### Favorites (`/api/v1/favorites`) — *All Protected*
- `GET /api/v1/favorites` — Get user's favorited restaurants and menu items.
- `POST /api/v1/favorites` — Add a restaurant or menu item to favorites (`restaurant_id` or `menu_item_id`).
- `DELETE /api/v1/favorites/:id` — Remove from favorites.

### Cart (`/api/v1/cart`) — *All Protected*
- `GET /api/v1/cart` — Full cart with restaurant details, items, selected add-ons, item totals, and server-computed breakdown (`subtotal`, `delivery_fee`, `platform_fee`, `total`, `item_count`).
- `POST /api/v1/cart/items` — Add item to cart with quantity, selected add-on options, special instructions, and conflict-handling (`menu_item_id`, `quantity`, `addon_option_ids`, `special_instructions`, `unavailable_action`, `clear_existing`).
- `PATCH /api/v1/cart/items/:id` — Update cart item quantity or special instructions.
- `DELETE /api/v1/cart/items/:id` — Remove specific item from cart.
- `PATCH /api/v1/cart/fulfillment` — Switch between `'delivery'` and `'pickup'`.
- `DELETE /api/v1/cart` — Clear entire cart.
- `GET /api/v1/cart/suggestions` — "Popular with your order" upsell recommendations from the active cart's restaurant.

### Checkout & Vouchers (`/api/v1/checkout`) — *All Protected*
- `GET /api/v1/checkout/summary?voucher_code=` — Server-calculated final breakdown (`subtotal`, `delivery_fee`, `platform_fee`, `discount_amount`, `voucher`, `total`) from active cart and optional voucher.
- `POST /api/v1/checkout/voucher/apply` — Validate voucher code (`min_order_amount`, validity window, user limits) and calculate discount.
- `POST /api/v1/checkout/voucher/remove` — Remove applied voucher.
- `GET /api/v1/checkout/payment-methods` — List saved payment methods.
- `POST /api/v1/checkout/payment-methods` — Add a new payment method (`card`, `cod`, `wallet`).
- `DELETE /api/v1/checkout/payment-methods/:id` — Remove payment method.

### Orders & Tracking (`/api/v1/orders`) — *All Protected*
- `POST /api/v1/orders` — **Atomic Order Creation**: wraps entire process in a MySQL transaction.
- `GET /api/v1/orders/:id` — Full order details with items, add-ons, status, rider info, and restaurant address.
- `GET /api/v1/orders?status=current|past&page=&limit=` — List user's active or completed orders with pagination.
- `GET /api/v1/orders/:id/track` — Real-time progress percentage, current step info, timeline, ETA, and rider details.
- `POST /api/v1/orders/:id/reorder` — Re-clones a past order's items into the user's active cart with live pricing and menu availability validation.
- `POST /api/v1/orders/:id/cancel` — Cancels an order (allowed only in `placed` or `preparing` status).
- `POST /api/v1/orders/:id/message` — "Contact your rider" in-app chat message.
- `GET /api/v1/orders/:id/messages` — Retrieve complete chat history for an order.

### Real-Time WebSockets (`Socket.IO`)
Connect via `ws://localhost:5000` with JWT in `auth.token`:
- **Client Emits**:
  - `joinOrder` `{ orderId }` — Join the tracking room for an authorized order.
  - `leaveOrder` `{ orderId }` — Leave the tracking room.
- **Server Emits**:
  - `order:statusUpdate` `{ orderId, status, estimatedDeliveryMin, riderName, timestamp }` — Emitted when order status changes (`placed` ➔ `preparing` ➔ `ready` ➔ `delivering` ➔ `delivered`).
  - `order:newMessage` `{ orderId, sender_type, sender_name, message, created_at }` — Emitted when a new chat message is sent.

### Background Jobs & Simulator
- **`orderStatusSimulator.js`**: Background state machine that automatically transitions active orders through realistic status timers and rider assignments, emitting live WebSocket updates and chat messages.

### Payments & Stripe (`/api/v1/payments`) — *Protected*
- `POST /api/v1/payments/setup-intent` — Create a Stripe SetupIntent for the authenticated customer.
- `POST /api/v1/payments/methods` — Save a confirmed Stripe PaymentMethod (`provider='stripe'`, brand, last4) with `Idempotency-Key` protection.
- `GET /api/v1/payments/methods` — List saved payment methods.
- `DELETE /api/v1/payments/methods/:id` — Detach from Stripe and delete from database.
- `POST /api/v1/payments/webhook` — Public Stripe webhook handler with cryptographic signature verification (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`).

### Admin Surface (`/api/v1/admin`) — *Role-Protected (`admin` | `restaurant_owner`)*
- `POST /api/v1/admin/restaurants` — Create a new restaurant.
- `PATCH /api/v1/admin/restaurants/:id` — Update restaurant details.
- `PATCH /api/v1/admin/restaurants/:id/toggle-active` — Toggle restaurant live status.
- `DELETE /api/v1/admin/restaurants/:id` — Delete restaurant.
- `POST /api/v1/admin/restaurants/:id/categories` — Create menu category.
- `POST /api/v1/admin/restaurants/:id/menu-items` — Create menu item.
- `PATCH /api/v1/admin/menu-items/:id` — Update menu item.
- `DELETE /api/v1/admin/menu-items/:id` — Delete menu item.
- `POST /api/v1/admin/vouchers` — (*Admin Only*) Create promo vouchers.
- `PATCH /api/v1/admin/vouchers/:id` — (*Admin Only*) Update voucher.
- `DELETE /api/v1/admin/vouchers/:id` — (*Admin Only*) Delete voucher.
- `GET /api/v1/admin/vouchers/:id/redemptions` — (*Admin Only*) List voucher redemptions.
- `GET /api/v1/admin/orders` — List orders (scoped to owned restaurant for `restaurant_owner`).
- `GET /api/v1/admin/orders/:id` — Get full order details.
- `PATCH /api/v1/admin/orders/:id/status` — Override order status.
- `POST /api/v1/admin/orders/:id/refund` — (*Admin Only*) Issue Stripe refund against PaymentIntent with `Idempotency-Key` protection.
- `GET /api/v1/admin/users` — (*Admin Only*) List users with search and pagination.
- `PATCH /api/v1/admin/users/:id/role` — (*Admin Only*) Promote/change user role.

### Security & Idempotency
- **Order Placement Idempotency**: `POST /orders`, `POST /payments/methods`, and `POST /admin/orders/:id/refund` support an `Idempotency-Key` header with 24-hour response caching.
- **Refresh Token Revocation**: Refresh tokens are stored as SHA-256 hashes in `refresh_tokens`. Every refresh rotates tokens and detects token reuse (attempted reuse of a revoked token automatically revokes all sessions for that user).
- **`POST /api/v1/auth/logout-all`**: Terminates all active user sessions across devices.

### Settings (`/api/v1/settings`)
- `GET /api/v1/settings` — Get user settings.
- `PATCH /api/v1/settings` — Update preferences (`language`, `push_notifications`, `email_offers`, `show_tracking_cost`).
#   f o o d m e n i a - s e r v e r  
 