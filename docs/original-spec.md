# PROFESSIONAL FOREX & CRYPTO TRADING BROKER WEBSITE

Build a modern, production-ready trading broker website and web trading terminal called **Vertex Trading**.

The website must have a professional financial/trading interface similar in functionality to modern online broker platforms.

## 1. TECHNOLOGY

Frontend:

* React / Next.js
* TypeScript
* Tailwind CSS
* Responsive design
* Dark and light trading themes

Backend:

* Node.js
* REST API
* WebSocket real-time market data
* PostgreSQL database
* Redis for caching/live sessions
* Secure authentication

Charts:

* TradingView Charting Library where licensing permits
* Or another licensed professional charting solution

Architecture must separate:

* Website frontend
* Trading terminal
* Authentication
* Market-data service
* Order-management service
* Broker/exchange integration
* User/account service
* Admin panel

---

# 2. MAIN WEBSITE

Create these pages:

### Home

Hero section:

**TRADE GLOBAL MARKETS WITH VERTEX**

Subtitle:
Trade Forex, Crypto and other supported financial instruments through a professional trading platform with real-time market data.

Buttons:

* Open Account
* Login
* Start Trading

Display:

* Live market prices
* Popular currency pairs
* Crypto prices
* Market statistics
* Platform features

### Markets

Display live instruments:

Forex:

* EUR/USD
* GBP/USD
* USD/JPY
* USD/CHF
* AUD/USD
* USD/CAD
* NZD/USD

Crypto:

* BTC/USD
* ETH/USD
* SOL/USD
* XRP/USD
* LTC/USD

The instrument list must come dynamically from the connected market-data provider rather than hard-coded prices.

### About

Company information, platform technology and services.

### Trading

Explain:

* Forex trading
* Crypto trading
* Market orders
* Limit orders
* Stop orders
* Stop Loss
* Take Profit
* Real-time charts

### Account Types

Create configurable account types:

STANDARD

* Minimum deposit configurable
* Variable spread
* Leverage configurable
* Commission configurable

PRO

* Lower spreads
* Commission-based pricing
* Advanced trading tools

VIP

* Custom pricing
* Dedicated support
* Advanced features

Do not hard-code financial conditions. Store them in the database/admin panel.

### Education

Sections:

* Forex basics
* Crypto basics
* Technical analysis
* Risk management
* Trading psychology
* Trading strategies

### Contact

Include:

* Contact form
* Email
* Phone
* WhatsApp
* Office information

---

# 3. USER REGISTRATION

Create secure registration:

Fields:

* First name
* Last name
* Email
* Mobile
* Country
* Password
* Confirm password

Authentication:

* Email verification
* OTP verification
* 2FA
* Login protection
* Password reset
* Session management

Never store passwords in plain text.

Use:

* Argon2id or bcrypt
* JWT/session-based authentication
* Secure HTTP-only cookies
* CSRF protection
* Rate limiting

---

# 4. KYC SYSTEM

Create a complete KYC dashboard.

User uploads:

* Passport/ID
* Proof of address
* Selfie/liveness verification if supported
* Additional documents requested by compliance

KYC status:

PENDING
UNDER REVIEW
APPROVED
REJECTED
ADDITIONAL INFORMATION REQUIRED

Admin can review documents and update status.

Store documents securely and restrict access using authorization controls.

---

# 5. TRADING TERMINAL

Create a professional trading dashboard.

Layout:

LEFT:
Watchlist

CENTER:
Advanced chart

RIGHT:
Order panel

BOTTOM:
Positions
Orders
Trade history
Account history

---

# 6. LIVE MARKET DATA

Connect to a legitimate market-data provider/API.

Use WebSockets wherever available.

Market data should include:

* Bid
* Ask
* Last price
* Spread
* 24h high
* 24h low
* Volume
* Price change
* Timestamp

The UI must update without refreshing the page.

IMPORTANT:

Do not generate fake prices.

The application must clearly identify:

* Data provider
* Market-data source
* Data timestamp
* Whether prices are indicative or executable

---

# 7. TRADINGVIEW-STYLE CHART

Create professional charts supporting:

* Candlesticks
* Line
* Area
* OHLC
* Volume

Timeframes:

1m
5m
15m
30m
1H
4H
1D
1W
1M

Indicators:

* Moving Average
* EMA
* SMA
* RSI
* MACD
* Bollinger Bands
* Stochastic
* ATR
* VWAP

Drawing tools:

* Trend line
* Horizontal line
* Vertical line
* Fibonacci retracement
* Rectangle
* Text
* Support/resistance

Users can save chart layouts.

---

# 8. ORDER PANEL

Create professional order-entry interface.

Instrument:
EUR/USD

Side:

BUY
SELL

Order Type:

MARKET
LIMIT
STOP
STOP LIMIT

Fields:

Volume
Entry Price
Stop Loss
Take Profit

Display before order submission:

Estimated spread
Estimated margin
Estimated required funds
Potential fees
Order size

Buttons:

BUY
SELL

Before submitting a live order, display a confirmation dialog.

Example:

CONFIRM ORDER

EUR/USD
BUY
Volume: 0.10
Entry: Market
Stop Loss: 1.16000
Take Profit: 1.17500

[Cancel] [Confirm Order]

---

# 9. ORDER EXECUTION ENGINE

Do NOT simulate live trading.

Create an abstraction layer:

TradingProvider

Methods:

getAccount()
getBalances()
getPositions()
getOrders()
getQuote()
placeOrder()
modifyOrder()
cancelOrder()
closePosition()

Example architecture:

Frontend
↓
Trading API
↓
Order Management Service
↓
Broker/Exchange Adapter
↓
Actual Broker/Exchange

The adapter should be replaceable so the platform can connect to an authorized broker/exchange.

Never expose broker API secrets in frontend JavaScript.

---

# 10. FOREX INTEGRATION

Create a Forex provider adapter.

Example:

ForexProvider

Functions:

getSymbols()
getQuote(symbol)
getCandles(symbol, timeframe)
placeOrder()
cancelOrder()
modifyOrder()
getPositions()
getBalance()

The implementation must use the API documentation of the selected authorized broker.

Do not invent API endpoints.

---

# 11. CRYPTO INTEGRATION

Create a separate crypto exchange adapter.

Example:

CryptoProvider

Functions:

getMarkets()
getTicker()
getOrderBook()
getCandles()
placeOrder()
cancelOrder()
getOpenOrders()
getBalances()

Support configurable exchanges through the admin panel.

API keys must be encrypted at rest.

Never send exchange secret keys to the browser.

---

# 12. WALLET / BALANCE

Dashboard should display:

Available Balance
Equity
Used Margin
Free Margin
Unrealized P/L
Realized P/L
Margin Level

For crypto accounts:

BTC
ETH
USDT
USDC
and supported assets.

---

# 13. POSITIONS

Positions table:

Symbol
Side
Volume
Entry Price
Current Price
Stop Loss
Take Profit
Swap/Funding
Unrealized P/L
Time

Actions:

Modify
Close
Close Partial

---

# 14. ORDER HISTORY

Display:

Order ID
Symbol
Side
Type
Volume
Price
Status
Created
Executed
Commission
Fees

Filters:

Date
Symbol
Side
Status

Export:
CSV
PDF

---

# 15. DEPOSIT SYSTEM

Create deposit page.

Supported payment providers should be configurable.

Methods can include:

* Bank transfer
* Card payment
* Approved payment gateway
* Crypto deposit

Deposit status:

PENDING
PROCESSING
COMPLETED
FAILED
REJECTED

Do not automatically mark a deposit successful unless confirmed by the payment provider.

---

# 16. WITHDRAWAL SYSTEM

Withdrawal page:

Amount
Currency
Method
Destination
Notes

Security:

* OTP
* 2FA
* Withdrawal confirmation
* Risk/compliance checks

Statuses:

PENDING
APPROVED
PROCESSING
COMPLETED
REJECTED

---

# 17. ADMIN PANEL

Create:

/admin

Admin dashboard:

Total users
Verified users
Pending KYC
Trading accounts
Total deposits
Pending withdrawals
Open positions
Trading volume
System status

Admin roles:

SUPER ADMIN
COMPLIANCE
TRADING ADMIN
SUPPORT
FINANCE

Use role-based access control.

---

# 18. ADMIN MARKET CONFIGURATION

Admin can configure:

Symbols
Trading hours
Trading permissions
Spread configuration
Commission
Contract size
Minimum volume
Maximum volume
Leverage limits
Trading fees

Do not allow arbitrary manipulation of external market prices.

---

# 19. USER MANAGEMENT

Admin can:

View users
Search users
Suspend account
Activate account
Reset security settings
Review KYC
View trading activity
View deposits
View withdrawals
View login history

All sensitive admin actions must be logged.

---

# 20. RISK MANAGEMENT

Implement:

Maximum position size
Maximum order size
Margin calculation
Margin warning
Stop-out rules
Maximum leverage
Trading-session restrictions
Symbol trading restrictions

Example statuses:

NORMAL

MARGIN WARNING

MARGIN CALL

STOP OUT

Risk rules must be configurable and enforced server-side.

---

# 21. SECURITY

Implement:

HTTPS
2FA
Rate limiting
CSRF protection
XSS protection
SQL injection protection
Secure cookies
Encryption at rest
Encrypted API credentials
RBAC
Audit logs
IP/device login monitoring
Session expiration
Password hashing

Never expose:

Broker API secrets
Database credentials
Payment API secrets
JWT signing keys
Encryption keys

in frontend code.

---

# 22. REAL-TIME SYSTEM

Use WebSockets for:

Market prices
Order updates
Position updates
Balance updates
Margin updates
Notifications

Example:

WebSocket events:

market.tick
market.candle
order.created
order.updated
order.filled
order.cancelled
position.opened
position.updated
position.closed
balance.updated
notification.created

---

# 23. NOTIFICATIONS

Create notification center.

Examples:

Order Filled
Order Rejected
Stop Loss Triggered
Take Profit Triggered
Deposit Completed
Withdrawal Update
KYC Update
Security Alert

Support:

* In-app
* Email
* SMS/WhatsApp where legally and technically supported

---

# 24. RESPONSIVE DESIGN

Desktop:
Professional multi-panel trading terminal.

Tablet:
Adaptive two-column layout.

Mobile:
Bottom navigation:

Home
Markets
Trade
Positions
Account

Charts must remain usable on mobile.

---

# 25. DATABASE STRUCTURE

Create tables:

users
user_sessions
two_factor_auth
kyc_profiles
kyc_documents
trading_accounts
instruments
market_quotes
candles
orders
order_executions
positions
balances
transactions
deposits
withdrawals
fees
commissions
notifications
api_connections
audit_logs
admin_users
admin_roles
system_settings

Use foreign keys and proper indexes.

---

# 26. API STRUCTURE

Example:

POST /api/auth/register

POST /api/auth/login

POST /api/auth/verify

GET /api/markets

GET /api/markets/:symbol/quote

GET /api/markets/:symbol/candles

GET /api/account

GET /api/account/balance

GET /api/positions

GET /api/orders

POST /api/orders

PATCH /api/orders/:id

DELETE /api/orders/:id

POST /api/positions/:id/close

GET /api/transactions

POST /api/deposits

POST /api/withdrawals

GET /api/kyc

POST /api/kyc/documents

---

# 27. TRADING ACCOUNT MODE

Support:

DEMO ACCOUNT

LIVE ACCOUNT

The demo account must be clearly marked as simulated.

The LIVE account must only send orders to the configured authorized broker/exchange.

Never mix demo and live balances.

---

# 28. IMPORTANT BROKER ARCHITECTURE

Build the system so the frontend does not directly connect to the broker.

Correct architecture:

```
                ┌─────────────────┐
                │   Web / Mobile  │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   API Gateway   │
                └────────┬────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   User Service    Trading Service   Payment Service
                         │
                         ▼
                ┌─────────────────┐
                │ Broker Adapter  │
                └────────┬────────┘
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
      Forex Broker API        Crypto Exchange API
```

---

# 29. VERTEX APP INTEGRATION

If "Vertex App" refers to a specific existing broker/app, first determine whether it provides an official API or SDK.

Create:

VertexProvider

with:

connect()
authenticate()
getAccount()
getMarkets()
getQuote()
getCandles()
placeOrder()
modifyOrder()
cancelOrder()
getOrders()
getPositions()
closePosition()
getBalance()

Only implement these methods according to the official Vertex API documentation.

If Vertex does not provide public order-execution APIs, do NOT attempt to automate its private mobile app, reverse-engineer its protocol, scrape it, or bypass authentication.

Instead, connect the website directly to a broker/exchange that officially supports API trading.

---

# 30. COMPLIANCE

The website must include configurable pages for:

Risk Disclosure
Terms & Conditions
Privacy Policy
Cookie Policy
AML Policy
KYC Policy
Execution Policy
Client Agreement
Fees & Charges
Complaints Procedure

The operator must configure these according to the jurisdiction and licenses applicable to the actual brokerage business.

Do not present the website as a licensed broker unless the operating entity actually holds the required authorization.

---

# 31. DISCLAIMER

Display appropriate risk disclosure:

"Trading leveraged financial products and cryptocurrencies involves significant risk and may not be suitable for all investors. You may lose some or all of your invested capital. Please consider your financial circumstances and risk tolerance before trading."

---

# 32. UI STYLE

Design:

Premium financial technology aesthetic.

Use:

* Dark trading interface
* Clean typography
* Professional tables
* Glass/modern cards
* Subtle animations
* Real-time price movement indicators
* Responsive charts
* Clear BUY/SELL controls
* Professional dashboard

Avoid:

* Casino-style graphics
* Fake profit claims
* Guaranteed-return language
* Fake live trading data
* Misleading performance statistics

---

# 33. FINAL DELIVERABLE

Generate a complete project with:

Frontend
Backend
Database schema
Authentication
KYC workflow
Admin dashboard
Trading terminal
Market-data WebSockets
Broker adapter architecture
Forex integration interface
Crypto integration interface
Order management
Positions
Balances
Deposits
Withdrawals
Notifications
Audit logs
Security
Responsive UI
Environment configuration
Docker configuration
API documentation
Database migrations
Testing

Provide:

README.md

.env.example

Dockerfile

docker-compose.yml

database migrations

API documentation

frontend source

backend source

admin source

unit tests

integration tests

security configuration

Deployment instructions

IMPORTANT:
Use real external APIs only after their credentials and official API documentation are supplied. Do not fabricate broker API endpoints, market prices, account balances, execution results, or trading activity.