# Dar Cafeteria Backend

Node.js + PostgreSQL REST API for the Dar Cafeteria iOS app — a homemade meal
delivery service in Qatar.

## Stack

- **Runtime:** Node.js ≥ 18
- **Framework:** Express 4
- **Database:** PostgreSQL 13+ (via Sequelize ORM)
- **Auth:** JWT (Bearer tokens) + bcrypt
- **Validation:** express-validator
- **Security:** helmet, cors, express-rate-limit

## Project layout

```
src/
├── app.js                # Express app (middleware + routes)
├── server.js             # HTTP bootstrap
├── config/               # env loader, Sequelize instance
├── models/               # Sequelize models + associations
├── controllers/          # Route handlers (incl. adminController)
├── routes/               # Express routers (incl. adminRoutes)
├── middleware/           # auth, validate, optionalAuth, errorHandler
├── utils/                # jwt, pricing, ApiError, asyncHandler, orderNumber
└── db/
    ├── migrate.js        # sequelize.sync()
    ├── seed.js           # Populate categories / food items / banners / admins
    └── seedData.js       # Ported from the iOS app's MockData.swift
public/
└── admin/                # Bundled web admin panel (static SPA)
    ├── index.html
    ├── css/admin.css
    └── js/               # api, ui, auth, app, views/*
```

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Provision PostgreSQL** and create a database:
   ```bash
   createdb darcafeteria
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # edit DB_*, JWT_SECRET, etc.
   ```

4. **Migrate + seed**
   ```bash
   npm run db:migrate       # create / sync tables
   npm run db:seed          # load categories, 15 food items, banners, demo users
   # or do both at once:
   npm run db:reset
   ```

5. **Run**
   ```bash
   npm run dev              # nodemon, auto-reload
   # or
   npm start
   ```

   API is served at `http://localhost:3000/api/v1`.

### Demo accounts (from seed)

| Email                     | Password               | Role     |
| ------------------------- | ---------------------- | -------- |
| admin@darcafeteria.com    | Darcafeteria11223344   | admin    |
| admin@darcafeteria.qa     | admin123               | admin    |
| guest@darcafeteria.qa     | guest123               | customer |

## Admin panel

A self-contained web UI is bundled with the server. After seeding, open:

```
http://localhost:3000/admin
```

Sign in with **admin@darcafeteria.com / Darcafeteria11223344**. The panel is a
static SPA under `public/admin/` (Bootstrap 5 + vanilla JS) that consumes the
same REST API. It lets an operator:

- See a **Dashboard** with totals for orders, revenue, customers, and menu
  items, plus a recent-orders feed and a top-selling-items list.
- Browse, filter, and **manage Orders** — advance through the status flow
  `Pending → Confirmed → Preparing → Ready → Delivered`, or mark as
  `Cancelled`, inspect items/history.
- Create / edit / delete **Menu items** with all bilingual fields, pricing,
  prep time, ingredients, tags, gradient colors, and the Popular / Chef's
  Special / Available flags.
- Manage **Categories** and promotional **Banners** (both surface to the iOS
  app's `GET /categories` and `GET /banners` endpoints).
- Manage **Users** — view activity, toggle active status, change role,
  reset password, or delete.

## Response envelope

All responses share this shape:

```jsonc
// success
{ "success": true, "data": { /* … */ } }

// error
{ "success": false, "error": { "message": "…", "details": [ /* optional */ ] } }
```

Send authenticated requests with `Authorization: Bearer <token>`.

## API reference

Base URL: `{{host}}/api/v1`

### Auth
| Method | Path              | Auth  | Description                      |
| ------ | ----------------- | ----- | -------------------------------- |
| POST   | `/auth/register`  | –     | Create an account, returns token |
| POST   | `/auth/login`     | –     | Login with email + password      |
| POST   | `/auth/guest`     | –     | Log in as the built-in guest     |
| POST   | `/auth/logout`    | Bearer| No-op for stateless JWT          |
| GET    | `/auth/me`        | Bearer| Current user                     |

### Users (self)
| Method | Path                                | Description                 |
| ------ | ----------------------------------- | --------------------------- |
| GET    | `/users/profile`                    | Profile + stats             |
| PATCH  | `/users/profile`                    | Update name/phone/address   |
| POST   | `/users/change-password`            | Change password             |
| DELETE | `/users/account`                    | Delete the account          |
| GET    | `/users/favorites`                  | List favourite food items   |
| POST   | `/users/favorites/:foodItemId`      | Add favourite               |
| DELETE | `/users/favorites/:foodItemId`      | Remove favourite            |
| GET    | `/users/addresses`                  | List delivery addresses     |
| POST   | `/users/addresses`                  | Create address              |
| PATCH  | `/users/addresses/:id`              | Update address              |
| DELETE | `/users/addresses/:id`              | Delete address              |

### Foods (public, optional auth decorates `isFavorited`)
| Method | Path                   | Description                                 |
| ------ | ---------------------- | ------------------------------------------- |
| GET    | `/foods`               | List, filters: `category`, `search`, `popular`, `chefSpecial`, `page`, `limit` |
| GET    | `/foods/popular`       | Popular items                               |
| GET    | `/foods/chef-specials` | Chef's specials                             |
| GET    | `/foods/search?q=…`    | Search by name / description / chef         |
| GET    | `/foods/:id`           | Single item                                 |
| POST   | `/foods`               | **admin** — create                          |
| PATCH  | `/foods/:id`           | **admin** — update                          |
| DELETE | `/foods/:id`           | **admin** — delete                          |

### Orders
| Method | Path                    | Auth    | Description                                   |
| ------ | ----------------------- | ------- | --------------------------------------------- |
| POST   | `/orders`               | Bearer  | Place an order from cart                      |
| GET    | `/orders`               | Bearer  | List my orders (`?status=active|history|...`) |
| GET    | `/orders/active`        | Bearer  | Active orders                                 |
| GET    | `/orders/history`       | Bearer  | Completed / cancelled                         |
| GET    | `/orders/:id`           | Bearer  | Single order                                  |
| POST   | `/orders/:id/cancel`    | Bearer  | Cancel a pending order                        |
| GET    | `/orders/admin/all`     | admin   | All orders in the system                      |
| PATCH  | `/orders/:id/status`    | admin   | Change status (records history)               |

Order body:
```json
{
  "items": [
    { "foodItemId": "uuid", "quantity": 2, "specialNote": "Extra spicy" }
  ],
  "deliveryAddress": "Flat 12, West Bay, Doha",
  "notes": "Leave at the door"
}
```

Delivery fee: **free** for subtotal ≥ QAR 50, otherwise QAR 5.
Order statuses: `Pending → Confirmed → Preparing → Ready → Delivered`, or `Cancelled`.

### Catalog
| Method | Path             | Description                   |
| ------ | ---------------- | ----------------------------- |
| GET    | `/categories`    | All food categories (bilingual) |
| POST   | `/categories`    | **admin** — create             |
| PATCH  | `/categories/:id`| **admin** — update             |
| DELETE | `/categories/:id`| **admin** — delete             |
| GET    | `/banners`       | Active promo banners           |
| GET    | `/banners/all`   | **admin** — all banners        |
| POST   | `/banners`       | **admin** — create             |
| PATCH  | `/banners/:id`   | **admin** — update             |
| DELETE | `/banners/:id`   | **admin** — delete             |

### Admin (all require admin role)
| Method | Path                                     | Description                |
| ------ | ---------------------------------------- | -------------------------- |
| GET    | `/admin/stats`                           | Dashboard KPIs + recent orders + top-selling foods |
| GET    | `/admin/users`                           | List users (`?search=`, `?role=`) |
| GET    | `/admin/users/:id`                       | User detail + stats + recent orders |
| PATCH  | `/admin/users/:id`                       | Update user (name/phone/address/role/isActive) |
| POST   | `/admin/users/:id/reset-password`        | Reset password             |
| DELETE | `/admin/users/:id`                       | Delete user                |
| GET    | `/admin/fcm-tokens`                      | Active device tokens, grouped by platform |
| GET    | `/admin/notifications`                   | Recent push-notification audit log |
| POST   | `/admin/notifications/send`              | Send a push (target = `all` / `user` / `token` / `topic`) |

### Push notifications (FCM)

The Android app registers its Firebase token with the backend so admins
can target devices from the **Notifications** view in the admin panel.

| Method | Path                  | Auth   | Description                       |
| ------ | --------------------- | ------ | --------------------------------- |
| POST   | `/users/fcm-token`    | Bearer | Upsert this device's token        |
| DELETE | `/users/fcm-token`    | Bearer | Mark a token inactive (sign-out)  |

**Backend setup**

1. In the Firebase Console: **Project Settings → Service Accounts →
   Generate new private key**. Save the resulting JSON somewhere safe
   on the server (do **not** commit it).
2. In `.env`, configure either:
   ```
   FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/to/serviceAccount.json
   ```
   or the three inline fields (single-line, with literal `\n` in the
   private key):
   ```
   FIREBASE_PROJECT_ID=dar-cafeteria
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@dar-cafeteria.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
3. Restart the server. The `firebase-admin` SDK is initialised lazily —
   the rest of the API works without these vars, but `/admin/notifications/send`
   will refuse with a clear error message until they're set.

**Sending from the admin panel**

Open `http://localhost:3000/admin#/notifications`, choose an audience
(everyone / a specific user / a topic / a single token), fill in the
title + body, and hit **Send**. The audit log on the right shows every
past send with success/failure counts pulled from FCM's response.

### Health
| Method | Path        | Description       |
| ------ | ----------- | ----------------- |
| GET    | `/health`   | Liveness check    |

## Data model

```
User 1—n Order 1—n OrderItem n—1 FoodItem
User n—m FoodItem  (via Favorite)
User 1—n Address
Category 1—n FoodItem          (FoodItem.categoryKey → Category.key)
Order 1—n OrderStatusHistory
```

All primary keys are UUID v4. Timestamps (`created_at`, `updated_at`) are
managed automatically. PostgreSQL `JSONB` columns are used for the bilingual
arrays (ingredients, tags, gradient colors).

## Notes for the iOS client

- The iOS app currently caches the `User`, `Cart`, `Orders`, and `FavoriteIds`
  in `UserDefaults`. The backend treats the cart as transient (sent only when
  placing an order) and owns Users / Orders / Favorites / Addresses.
- All texts are bilingual (`name` / `nameAr`, `description` / `descriptionAr`,
  etc.) so the client can continue to switch languages without a round-trip.
- `gradientColors` and `symbolName` are returned exactly as `MockData.swift`
  produced them, so existing SwiftUI rendering continues to work unchanged.

## Scripts

| Script            | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `npm start`       | Start the server                                |
| `npm run dev`     | Start with nodemon                              |
| `npm run db:migrate` | Sync Sequelize models (pass `--alter` or `--force`) |
| `npm run db:seed` | Seed categories / foods / banners / demo users  |
| `npm run db:reset`| Migrate then seed                               |
