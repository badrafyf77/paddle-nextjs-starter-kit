# RealtimeVoiceChat

Real-time AI voice chat with streaming LLM and TTS.

## 🚀 Quick Start

### Default: vLLM (Multi-User Optimized)

```bash
# 1. Copy environment config
cp .env.example .env

# 2. Run with Docker (vLLM + Voice Chat)
docker-compose -f docker-compose.vllm.yml up -d

# 3. Open browser
open http://localhost:8080
```

**Note:** First run will download the model (~6GB). vLLM handles multiple concurrent users efficiently with continuous batching.

### Alternative: AWS Bedrock Agent

```bash
# 1. Configure AWS credentials in .env
# 2. Run with Docker
docker-compose up -d
# 3. Open http://localhost:8000
```

### Alternative: Local Ollama (Single User)

```bash
docker-compose -f docker-compose.ollama.yml up -d
```

## 📖 Documentation

- **🎯 Bedrock Setup**: [`code/BEDROCK_QUICKSTART.md`](code/BEDROCK_QUICKSTART.md) - 5-minute guide
- **📚 Full Integration**: [`code/BEDROCK_INTEGRATION.md`](code/BEDROCK_INTEGRATION.md) - Complete docs
- **🐳 Docker Explained**: [`code/DOCKER_AND_BEDROCK.md`](code/DOCKER_AND_BEDROCK.md) - Size & setup
- **🔄 Default Changed**: [`README_BEDROCK_DEFAULT.md`](README_BEDROCK_DEFAULT.md) - What's new

## 🎛️ LLM Providers

| Provider           | Setup           | Use Case                     | Multi-User   |
| ------------------ | --------------- | ---------------------------- | ------------ |
| **vLLM** (default) | Local GPU       | Multi-user, high performance | ✅ Excellent |
| **Bedrock**        | AWS credentials | Production, managed          | ✅ Yes       |
| **Ollama**         | Local GPU       | Development, single user     | ⚠️ Limited   |
| **OpenAI**         | API key         | Quick testing                | ✅ Yes       |
| **LM Studio**      | Local server    | Custom models                | ⚠️ Limited   |

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
# LLM Provider (default: vllm)
LLM_PROVIDER=vllm  # or: bedrock, ollama, openai, lmstudio

# vLLM (default) - Best for multiple concurrent users
VLLM_BASE_URL=http://vllm:8000/v1  # Use 'vllm' in Docker, 'localhost' for local
LLM_MODEL=meta-llama/Llama-3.2-3B-Instruct

# Bedrock (if LLM_PROVIDER=bedrock)
BEDROCK_AGENT_ID=your_agent_id
BEDROCK_AGENT_ALIAS_ID=your_alias_id
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Ollama (if LLM_PROVIDER=ollama) - Single user only
OLLAMA_BASE_URL=http://ollama:11434
LLM_MODEL=llama3.2:latest
```

See [`.env.example`](.env.example) for all options.

## 📦 Docker Images

| Setup       | Size    | What's Included    | Multi-User   |
| ----------- | ------- | ------------------ | ------------ |
| **vLLM**    | ~8-12GB | App + TTS + vLLM   | ✅ Excellent |
| **Bedrock** | ~5GB    | App + TTS (no LLM) | ✅ Yes       |
| **Ollama**  | ~7-10GB | App + TTS + Ollama | ⚠️ Limited   |

vLLM uses continuous batching for efficient multi-user handling.

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
