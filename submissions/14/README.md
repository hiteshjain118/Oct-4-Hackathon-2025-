# AI-Powered Dentist Appointment Booking App

A TypeScript application that uses voice commands to book dentist appointments. The app records audio from patients, processes it with OpenAI's AI to understand the intent, use preconfigured details about the user and automatically fills the appointment form using Playwright automation.

## Features

- 🎤 **Voice Recording**: Records patient voice commands
- 🧠 **AI Processing**: Uses OpenAI's GPT-4 and Whisper for intent recognition and data extraction
- 🤖 **Form Automation**: Automatically fills appointment forms using Playwright
- 📸 **Screenshots**: Takes screenshots for verification and debugging

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key
- Audio recording capabilities (for voice commands)

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Available Commands

When you run the app, you'll see a menu with these options:

1. **Record voice command (v)**: Records audio and processes it with AI
2. **Test with manual data (t)**: Test the form filling with manual input
3. **View form fields (f)**: Inspect the target form fields
4. **Take screenshot (s)**: Capture a screenshot of the current page
5. **Exit (q)**: Quit the application

## How It Works

1. **Audio Recording**: The app records patient voice commands
2. **AI Processing**: 
   - Transcribes audio using OpenAI's Whisper
   - Analyzes intent using GPT-4 to determine if it's an appointment booking request
   - Extracts appointment details (name, email, date of birth, phone, comments)
3. **Form Automation**: Uses Playwright to navigate to the dentist's website and fill the appointment form
4. **Verification**: Takes screenshots and provides feedback on success/failure

## Configuration

The app can be configured through environment variables in `.env`:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Audio Recording
AUDIO_SAMPLE_RATE=16000
AUDIO_CHANNELS=1
AUDIO_BITS_PER_SAMPLE=16

# Playwright Configuration
HEADLESS_BROWSER=true
BROWSER_TIMEOUT=30000
DENTIST_URL=https://dentistdowntownseattle.com/book-an-appointment/
```

## Project Structure

```
src/
├── index.ts                 # Main application entry point
├── appointmentBookingApp.ts # Core application logic
├── audioRecorder.ts         # Audio recording functionality
├── openaiService.ts         # OpenAI API integration
├── formFiller.ts           # Playwright form automation
├── config.ts               # Configuration and validation
└── types.ts                # TypeScript type definitions
```

## Example Voice Commands

The AI can understand various ways of requesting appointments:

- "I'd like to book an appointment for next Tuesday"
- "Can I schedule a dental checkup for John Smith, email john@example.com, born 01/15/1990"
- "I need to make an appointment, my name is Jane Doe, I was born on March 10th 1985"
- "Book me an appointment for a cleaning, call me at 555-123-4567"

## Error Handling

The app includes comprehensive error handling for:
- Missing environment variables
- Audio recording failures
- OpenAI API errors
- Form filling errors
- Network connectivity issues
- Invalid data validation

## Screenshots

The app automatically takes screenshots:
- Before filling the form
- After submitting the form
- On errors for debugging

Screenshots are saved in the `screenshots/` directory.

## Development Notes

- The audio recording is currently simulated for demonstration purposes
- In a production environment, you would integrate with actual audio recording hardware
- The form field selectors are designed to work with the specific dentist website
- Error messages are logged to the console for debugging

## Troubleshooting

1. **OpenAI API Errors**: Ensure your API key is valid and has sufficient credits
2. **Playwright Issues**: Make sure browsers are installed with `npx playwright install`
3. **Form Filling Fails**: Check if the target website structure has changed
4. **Audio Recording Issues**: Verify audio recording permissions and hardware

## License

MIT License - feel free to use this project for your own applications.
