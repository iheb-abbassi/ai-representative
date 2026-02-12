# AI Interview Representative

An AI-powered interview representative that speaks on behalf of a job candidate during interviews. The application captures audio questions, transcribes them using OpenAI Whisper, generates contextually appropriate responses using GPT-4o, and returns text-to-speech audio responses.

## Overview

This is a full-stack web application consisting of:
- **Backend**: Spring Boot application with LangChain4j for OpenAI integration
- **Frontend**: Vanilla TypeScript application with Vite build tooling

### Use Case

An automated job interview proxy that uses AI to generate professional responses to interview questions based on a job candidate persona.

## Features

- Real-time audio recording with waveform visualization
- Speech-to-text transcription using OpenAI Whisper
- AI-generated responses using GPT-4o with job candidate persona
- Text-to-speech audio responses
- Conversation history context
- Responsive web interface
- CORS-enabled for Vercel deployment

## Tech Stack

### Backend
- **Spring Boot 3.4.x** with Java 17
- **LangChain4j 0.36.2** for OpenAI API integration
- **OpenAI APIs**: Whisper, GPT-4o, TTS

### Frontend
- **Vanilla JavaScript (ES6+)** with TypeScript
- **Vite** for build tooling
- **Web Audio API** for audio capture and playback
- **MediaRecorder API** for recording
- **Canvas API** for audio visualization

## Project Structure

```
meet-my-ai-representative/
├── backend/                    # Spring Boot backend
│   ├── src/main/
│   │   ├── java/com/ai/representative/
│   │   │   ├── config/         # Configuration classes
│   │   │   ├── controller/     # REST controllers
│   │   │   ├── service/        # Business logic
│   │   │   ├── model/dto/      # Data transfer objects
│   │   │   └── exception/      # Error handling
│   │   └── resources/
│   │       ├── application.yml
│   │       └── prompts/        # System prompts
│   ├── deployment/
│   │   └── systemd/           # Systemd service file
│   └── pom.xml
│
├── frontend/                   # Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── services/          # API clients, audio services
│   │   ├── types/            # TypeScript types
│   │   ├── app.ts             # Main app logic
│   │   ├── main.ts            # Entry point
│   │   └── style.css          # Global styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── .env.example
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- **Java 17** or higher
- **Maven 3.8+** (for backend)
- **Node.js 18+** and **npm** (for frontend)
- **OpenAI API Key**

### 1. Clone and Setup

```bash
git clone <repository-url>
cd meet-my-ai-representative
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` and set your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080
VITE_API_URL=http://localhost:8080
```

### 3. Run Backend

```bash
cd backend
./mvnw spring-boot:run
```

The backend will start on `http://localhost:8080`

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

### 5. Test the Application

1. Open `http://localhost:5173` in your browser
2. Grant microphone permissions when prompted
3. Hold the record button and speak your interview question
4. Release to get the AI-generated audio response

## API Endpoints

### POST /api/v1/interview/speak
Process interview audio question and return AI response.

**Request**: `multipart/form-data` with `audio` field
**Response**: JSON with transcription, response text, and base64-encoded audio

```bash
curl -X POST http://localhost:8080/api/v1/interview/speak \
  -F "audio=@question.mp3"
```

### GET /api/v1/interview/health
Health check endpoint.

```bash
curl http://localhost:8080/api/v1/interview/health
```

### POST /api/v1/interview/reset
Reset conversation context.

```bash
curl -X POST http://localhost:8080/api/v1/interview/reset
```

## Deployment

### Backend (VPS)

1. Build the JAR:
```bash
cd backend
./mvnw clean package -DskipTests
```

2. Upload to VPS:
```bash
scp target/ai-representative.jar user@vps:/opt/ai-representative/
```

3. Set up environment file on VPS:
```bash
# /opt/ai-representative/.env
OPENAI_API_KEY=sk-...
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=prod
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

4. Install systemd service:
```bash
sudo cp backend/deployment/systemd/ai-representative.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ai-representative
sudo systemctl start ai-representative
```

5. Check status:
```bash
sudo systemctl status ai-representative
```

### Frontend (Vercel)

1. Push frontend code to GitHub

2. Import project in Vercel:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. Set environment variable in Vercel dashboard:
   - `VITE_API_URL`: Your backend URL (e.g., `https://api.yourdomain.com`)

4. Deploy - Vercel auto-builds on git push

## Nginx Reverse Proxy (Optional)

For HTTPS on your VPS:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 25M;
    }
}
```

## Cost Considerations

Each interview question incurs 3 OpenAI API calls:
1. Whisper API (transcription)
2. GPT-4o (conversation)
3. TTS API (text-to-speech)

Approximate cost per question: $0.01 - $0.03 USD

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

**Note**: Microphone access requires HTTPS on non-localhost URLs.

## Configuration

### Backend (application.yml)

```yaml
openai:
  api-key: ${OPENAI_API_KEY}
  chat:
    model: gpt-4o
    temperature: 0.7
  tts:
    voice: alloy  # alloy, echo, fable, onyx, nova, shimmer

audio:
  supported-formats: audio/mp3,audio/wav,audio/webm
  max-size-bytes: 26214400  # 25MB
```

### Frontend

Edit `src/components/Visualizer.ts` for visualization settings:
```typescript
new AudioVisualizer({
  width: 320,
  height: 80,
  barColor: '#4ade80',
});
```

## Troubleshooting

### Backend fails to start
- Check OpenAI API key is set correctly
- Verify port 8080 is not in use
- Check logs: `tail -f backend/logs/spring.log`

### Frontend can't connect to backend
- Verify CORS settings in `application.yml`
- Check backend is running on correct port
- Ensure `VITE_API_URL` is set correctly

### Microphone not working
- Grant microphone permissions in browser
- Check browser console for errors
- Ensure HTTPS (required on non-localhost)

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
