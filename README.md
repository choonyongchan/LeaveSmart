# LeaveSmart
Delivers Singapore weather and transit alerts to users stepping outdoors.

## Acknowledgement
I would like to express my heartfelt gratitude to my mother, Susie, for her unwavering support and encouragement in pursuing my Computing ambitions. Her belief in me has been a constant source of inspiration throughout this journey. This project is dedicated to you.

## Features

- **Real-Time Alerts:** Receive weather and transit notifications tailored to your location.
- **WhatsApp Integration:** Seamlessly interact with LeaveSmart using WhatsApp commands.
- **Customizable Notifications:** Subscribe or unsubscribe to alerts based on your preferences.

## How It Works

1. **Start the Application**  
    Run the following command in your project directory:
    ```bash
    npm run start
    ```

2. **Register Your Device**  
    - A QR code will be displayed in the terminal.
    - Open WhatsApp on your phone and scan the QR code to register a new device.

3. **Activate LeaveSmart on Your Device**  
    - On the registered device, open your WhatsApp chat with your own number.
    - Send the command `/watch` to begin receiving LeaveSmart alerts.

4. **Manage Notifications on Other Devices**  
    - To subscribe to LeaveSmart notifications, send `/sub` from any other device.
    - To unsubscribe, send `/unsub`.
    - To get the current LeaveSmart notification instantly, send `/now`.

## Notes

- **Supported Area:**  
  LeaveSmart currently supports only the Pasir Ris area in Singapore.
- **Feature Requests:**  
  If you would like support for more locations, please open an Issue in the repository.

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/your-username/LeaveSmart.git
    cd LeaveSmart
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Start the application:
    ```bash
    npm run start
    ```

## Commands

- `/watch` - Start receiving LeaveSmart alerts on the registered device.
- `/sub` - Subscribe to notifications from another device.
- `/unsub` - Unsubscribe from notifications on a device.
- `/now` - Get the current LeaveSmart notification instantly.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
    ```bash
    git checkout -b feature-name
    ```
3. Commit your changes:
    ```bash
    git commit -m "Add feature-name"
    ```
4. Push to the branch:
    ```bash
    git push origin feature-name
    ```
5. Open a pull request.

## Future Work

1. Migrate to TypeScript-only execution for easier maintenance.
2. Migrate to a serverless solution for more cost-effective maintenance.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any inquiries or feedback, please open an Issue or contact the repository owner.
