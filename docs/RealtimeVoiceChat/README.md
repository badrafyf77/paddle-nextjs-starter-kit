# RealtimeVoiceChat

Real-time AI voice chat with streaming LLM and TTS.

## 🚀 Quick Start

### Default: AWS Bedrock Agent

```bash
# 1. Configure AWS credentials
cp .env.example .env
# Edit .env with your AWS credentials and Bedrock Agent IDs

# 2. Run with Docker
docker-compose up -d

# 3. Open browser
open http://localhost:8000
```

### Alternative: Local Ollama

```bash
# Use Ollama instead of Bedrock
docker-compose -f docker-compose.ollama.yml up -d
```

## 📖 Documentation

- **🎯 Bedrock Setup**: [`code/BEDROCK_QUICKSTART.md`](code/BEDROCK_QUICKSTART.md) - 5-minute guide
- **📚 Full Integration**: [`code/BEDROCK_INTEGRATION.md`](code/BEDROCK_INTEGRATION.md) - Complete docs
- **🐳 Docker Explained**: [`code/DOCKER_AND_BEDROCK.md`](code/DOCKER_AND_BEDROCK.md) - Size & setup
- **🔄 Default Changed**: [`README_BEDROCK_DEFAULT.md`](README_BEDROCK_DEFAULT.md) - What's new

## 🎛️ LLM Providers

| Provider              | Setup           | Use Case             |
| --------------------- | --------------- | -------------------- |
| **Bedrock** (default) | AWS credentials | Production, scalable |
| **Ollama**            | Local GPU       | Development, offline |
| **OpenAI**            | API key         | Quick testing        |
| **LM Studio**         | Local server    | Custom models        |

Switch providers via `LLM_PROVIDER` environment variable.

## 🏗️ Architecture

```
User Voice → STT (Whisper) → LLM (Bedrock/Ollama) → TTS (Kokoro) → Audio
                ↓                    ↓                      ↓
           Turn Detection    Streaming Tokens      GPU Acceleration
```

## 🔧 Configuration

### Environment Variables

```bash
# LLM Provider
LLM_PROVIDER=bedrock  # or: ollama, openai, lmstudio

# Bedrock (if LLM_PROVIDER=bedrock)
BEDROCK_AGENT_ID=your_agent_id
BEDROCK_AGENT_ALIAS_ID=your_alias_id
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Ollama (if LLM_PROVIDER=ollama)
OLLAMA_BASE_URL=http://ollama:11434
LLM_MODEL=llama3.2:latest
```

See [`.env.example`](.env.example) for all options.

## 📦 Docker Images

| Setup       | Size    | What's Included    |
| ----------- | ------- | ------------------ |
| **Bedrock** | ~5GB    | App + TTS (no LLM) |
| **Ollama**  | ~7-10GB | App + TTS + Ollama |

See [`code/DOCKER_AND_BEDROCK.md`](code/DOCKER_AND_BEDROCK.md) for optimization tips.

## 🎨 Frontend

Located in `code/static-alpine/` (Alpine.js + Tailwind)

```bash
cd code/static-alpine
npm install
npm run build
```

## 🧪 Development

```bash
# Run without Docker
cd code
python server.py

# Frontend dev server
cd code/static-alpine
npm run dev
```

## 📝 License

[Your License Here]
