# Kun Khmer Mobile Top-Up Service

This repository contains the source code for a web-based top-up service for the "Kun Khmer Mobile" game. It provides a user-friendly portal for players to purchase in-game currency (RP) and VIP memberships using local Cambodian bank QR code payments (ABA Bank and ACLEDA Bank).

## Features

- **Web Portal**: A responsive, multi-language (Khmer/English) frontend for creating top-up orders.
- **PlayFab Integration**: Fetches player profiles for verification and directly adds virtual currency or VIP status to player accounts upon successful payment.
- **Automated Payment Verification**: A listener service connects to a Telegram account to automatically parse payment notification messages from ABA and ACLEDA banks, matching them to pending orders.
- **Order Management**: Creates unique, short-lived orders with a 4-digit code that players use in the payment reference.
- **Admin Notifications**: Sends real-time order status updates (created, paid, mismatch, cancelled) to a designated Telegram group chat.
- **Database**: Uses SQLite to persist order information, including transaction history and currency balance changes.
- **Containerized**: Includes a `Dockerfile` and PM2 configuration for easy and reliable deployment.

## Architecture

The service is composed of two main components that run concurrently:

1.  **Express Web Server (`server.js`)**:
    - Serves the static frontend files from the `/public` directory.
    - Exposes API endpoints for creating and canceling orders.
    - Interacts with the PlayFab service to validate players and grant items/currency.
    - Receives payment verification requests from the `listener` service.

2.  **Telegram Payment Listener (`listener.js`)**:
    - Logs into a personal Telegram account using the `telegram` library.
    - Monitors incoming messages for payment notifications from ABA Bank and ACLEDA Bank.
    - Parses the message content to extract the amount and the unique order code (Remark/Purpose).
    - Makes an API call to the web server's `/api/verify-payment` endpoint to trigger the order fulfillment process.

These two processes are managed by **PM2** using the `ecosystem.config.js` file, ensuring they both run as part of the application.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, Tailwind CSS, Vanilla JavaScript
- **Database**: SQLite3
- **Game Backend Integration**: PlayFab SDK
- **Payment Automation**: Telegram Client API (`telegram` library)
- **Admin Notifications**: Telegram Bot API (`node-telegram-bot-api`)
- **Process Manager**: PM2
- **Containerization**: Docker

## Getting Started

### Prerequisites

- Node.js (v22 or later)
- Git
- A personal Telegram account that receives bank payment notifications.
- A Telegram Bot and its token/admin chat ID.
- PlayFab Title ID and Developer Secret Key.

### Installation & Configuration

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/kunsky12/topup-service.git
    cd topup-service
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the root directory and add the following environment variables.

    ```env
    # Server Configuration
    PORT=3000
    NODE_ENV=production
    ORDER_EXPIRATION=5 # Order expiration time in minutes

    # PlayFab Credentials
    PLAYFAB_TITLE_ID=YOUR_PLAYFAB_TITLE_ID
    PLAYFAB_SECRET_KEY=YOUR_PLAYFAB_SECRET_KEY

    # Telegram Listener Credentials (for reading payment notifications)
    TELEGRAM_API_ID=YOUR_TELEGRAM_API_ID
    TELEGRAM_API_HASH=YOUR_TELEGRAM_API_HASH
    TELEGRAM_SESSION="" # Leave this empty on first run, then paste the generated session string here

    # Telegram Bot for Admin Notifications
    TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
    TELEGRAM_ADMIN_CHAT_ID=YOUR_GROUP_OR_USER_CHAT_ID

    # Security
    JWT_SECRET_KEY=YOUR_STRONG_RANDOM_SECRET_KEY

    # In-Game Notification Service (Optional)
    WEBSOCKET_URL=http://your-game-server/api/notify
    ```

### Running the Application

The application requires two processes to run simultaneously: the web server and the payment listener.

**First Run (Generating a Telegram Session):**

The first time you run the listener, it will prompt you for your phone number, password (if any), and an OTP code to log in. It will then print a session string to the console.

1.  Run the listener script alone:
    ```bash
    node listener.js
    ```
2.  Follow the prompts in your terminal to log in.
3.  Copy the entire session string that is printed to the console (it's very long).
4.  Paste this string into your `.env` file for the `TELEGRAM_SESSION` variable. This will allow the listener to log in without manual intervention in the future.
5.  Stop the script (`Ctrl+C`).

**Running with PM2 (Recommended):**

PM2 will manage both processes as defined in `ecosystem.config.js`.

```bash
# Install PM2 globally if you haven't already
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# To monitor the processes
pm2 monit

# To view logs
pm2 logs
```

## Running with Docker

The provided `Dockerfile` builds a production-ready image that runs the application using PM2.

1.  **Build the Docker image:**
    ```bash
    docker build -t topup-service .
    ```

2.  **Run the Docker container:**
    Make sure your `.env` file is complete, including the `TELEGRAM_SESSION` string.
    ```bash
    docker run -d --name topup-service-container -p 3000:3000 --env-file .env topup-service
    ```

    The service will now be accessible at `http://localhost:3000`.

## API Endpoints

-   `POST /api/topup/create`: Creates a new order. Requires `playerId`, `type`, `pack`, `amount`, `paymentMethod`. Returns a unique `orderCode` for the payment reference.
-   `POST /api/topup/cancel/:orderCode`: Cancels a pending order.
-   `POST /api/verify-payment`: An internal endpoint called by `listener.js` to process a payment after it has been detected. Requires `orderId` (the 4-digit code) and `amount`.
