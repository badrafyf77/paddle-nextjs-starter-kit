# vLLM Setup Guide for Multi-User Voice Chat

vLLM is now the **default LLM provider** for this voice chat application because it's optimized for handling multiple concurrent users efficiently.

## Why vLLM for Multi-User?

- **Continuous Batching**: Processes multiple requests simultaneously
- **High Throughput**: 10-20x faster than Ollama for concurrent users
- **Memory Efficient**: Better GPU memory utilization
- **OpenAI Compatible**: Drop-in replacement with familiar API

## Quick Start with Docker

```bash
# 1. Copy environment config
cp .env.example .env

# 2. Start vLLM + Voice Chat
docker-compose -f docker-compose.vllm.yml up -d

# 3. Wait for model download (first time only, ~6GB)
docker logs -f realtime-voice-chat-vllm

# 4. Open browser
open http://localhost:8080
```

## Testing Multiple Users

Once running, test with multiple users:

```bash
# On your computer
open http://localhost:8080

# On your phone (same WiFi)
# Find your IP: ifconfig | grep "inet " | grep -v 127.0.0.1
open http://YOUR_IP:8080
```

## Configuration Options

### Model Selection

Edit `docker-compose.vllm.yml` to change the model:

```yaml
command:
  - --model
  - meta-llama/Llama-3.2-3B-Instruct # Change this
```

**Recommended models for voice chat:**

- `meta-llama/Llama-3.2-3B-Instruct` (default, fast, 6GB)
- `meta-llama/Llama-3.2-1B-Instruct` (faster, 2GB)
- `Qwen/Qwen2.5-3B-Instruct` (good quality, 6GB)

### Multi-User Settings

Adjust concurrent user capacity in `docker-compose.vllm.yml`:

```yaml
command:
  - --max-num-seqs
  - '32' # Max concurrent requests (increase for more users)
  - --max-num-batched-tokens
  - '8192' # Batch size (increase for better throughput)
```

**Guidelines:**

- 3B model: 16-32 concurrent users on 24GB GPU
- 1B model: 32-64 concurrent users on 24GB GPU

### GPU Memory

Adjust GPU memory usage:

```yaml
command:
  - --gpu-memory-utilization
  - '0.9' # Use 90% of GPU memory (0.0-1.0)
```

## Performance Monitoring

Check vLLM performance:

```bash
# View vLLM logs
docker logs -f realtime-voice-chat-vllm

# Check GPU usage
nvidia-smi -l 1
```

## Troubleshooting

### Model Download Fails

```bash
# Pre-download model manually
docker exec -it realtime-voice-chat-vllm bash
huggingface-cli download meta-llama/Llama-3.2-3B-Instruct
```

### Out of Memory

Reduce `--max-num-seqs` or use a smaller model:

```yaml
command:
  - --model
  - meta-llama/Llama-3.2-1B-Instruct # Smaller model
  - --max-num-seqs
  - '16' # Fewer concurrent users
```

### Slow Response

Increase batch size for better throughput:

```yaml
command:
  - --max-num-batched-tokens
  - '16384' # Larger batches
```

## Local Development (Without Docker)

```bash
# 1. Install vLLM
pip install vllm

# 2. Start vLLM server
vllm serve meta-llama/Llama-3.2-3B-Instruct \
  --max-num-seqs 32 \
  --gpu-memory-utilization 0.9

# 3. Update .env
echo "LLM_PROVIDER=vllm" > .env
echo "VLLM_BASE_URL=http://localhost:8000/v1" >> .env
echo "LLM_MODEL=meta-llama/Llama-3.2-3B-Instruct" >> .env

# 4. Run voice chat
cd code
python server.py
```

## Switching Back to Other Providers

Edit `.env`:

```bash
# Use Ollama (single user)
LLM_PROVIDER=ollama

# Use Bedrock (AWS managed)
LLM_PROVIDER=bedrock

# Use OpenAI
LLM_PROVIDER=openai
```

## Performance Comparison

| Provider | Single User | 5 Users | 10 Users  | 20 Users |
| -------- | ----------- | ------- | --------- | -------- |
| vLLM     | Fast        | Fast    | Fast      | Fast     |
| Ollama   | Fast        | Slow    | Very Slow | Fails    |
| Bedrock  | Fast        | Fast    | Fast      | Fast     |

vLLM is the best choice for self-hosted multi-user deployments.
