# E-Commerce Backend (Spring Boot + MySQL + JWT)

## Run
1. Install Java 17+ and MySQL. Start MySQL.
2. Open `src/main/resources/application.properties` and set your MySQL username/password.
   (The database `ecommerce_db` is created automatically.)
3. Run: `mvn spring-boot:run`  (or run `EcommerceApplication` from your IDE)

A default admin is created on first start:
- email: `admin@example.com`
- password: `admin123`

## APIs
| Method | URL | Who | Body
| POST | /api/auth/register | public | name, email, password |
| POST | /api/auth/login | public | email, password -> returns token |
| GET | /api/products | logged in | - |
| POST | /api/products | ADMIN | name, price, quantity |
| PUT | /api/products/{id} | ADMIN | name, price, quantity |
| PATCH | /api/products/{id}/disable | ADMIN | - |
| GET | /api/cart | USER | - |
| POST | /api/cart | USER | productId, quantity |
| PUT | /api/cart/{cartItemId} | USER | quantity |
| DELETE | /api/cart/{cartItemId} | USER | - |
| POST | /api/orders | USER | - (places order from cart) |
| GET | /api/orders | USER | - |

Send the token on every protected request:
`Authorization: Bearer <token>`

## Postman test order
1. Login as admin -> copy token -> POST /api/products (add Laptop, Mouse)
2. Register a user -> login -> copy token
3. GET /api/products -> POST /api/cart -> GET /api/cart
4. POST /api/orders -> check stock reduced and cart empty
5. Try ordering more than the stock -> you get 400 and nothing changes (rollback)
