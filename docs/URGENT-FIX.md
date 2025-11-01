# URGENT FIX: spaCy Model Missing

## Problem

The server crashes when users connect with this error:

```
OSError: [E050] Can't find model 'en_core_web_sm'. It doesn't seem to be a Python package or a valid path to a data directory.
```

**Root Cause:** The spaCy model `en_core_web_sm` is not pre-installed in the Docker image. It tries to install at runtime (when a user connects) but fails because:

1. The installation happens in user space (not system-wide)
2. The model isn't persisted between connections
3. Each new pipeline creation tries to download it again

## Solution

### Option 1: Rebuild Docker Image (Recommended)

I've updated the Dockerfile to pre-install the spaCy model. You need to rebuild and redeploy:

```bash
# On your local machine or build server
cd docs/RealtimeVoiceChat

# Rebuild the Docker image
docker build -t your-registry/voice-chat:latest .

# Push to your registry
docker push your-registry/voice-chat:latest

# On EC2, pull and restart
docker pull your-registry/voice-chat:latest
docker-compose down
docker-compose up -d
```

### Option 2: Quick Fix (Install in Running Container)

If you need an immediate fix without rebuilding:

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Find the running container
docker ps

# Install spaCy model in the running container
docker exec -it realtime-voice-chat-app bash

# Inside the container, run:
python3 -m spacy download en_core_web_sm

# Verify it works
python3 -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('Success!')"

# Exit the container
exit

# Restart the container
docker restart realtime-voice-chat-app
```

**Note:** This fix is temporary and will be lost if the container is recreated. You still need to rebuild the image.

### Option 3: Manual Installation Script

Create a script to run on container startup:

```bash
# On EC2, create a script
cat > /path/to/install-spacy.sh << 'EOF'
#!/bin/bash
echo "Checking for spaCy model..."
python3 -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing spaCy model..."
    python3 -m spacy download en_core_web_sm
fi
echo "spaCy model ready."
EOF

chmod +x /path/to/install-spacy.sh

# Update your docker-compose.yml or entrypoint to run this script
```

## What Changed in Dockerfile

Added this section after the SentenceFinishedClassification download:

```dockerfile
# <<<--- spaCy en_core_web_sm Pre-download --->>>
RUN echo "Preloading spaCy en_core_web_sm model..." && \
    python3 -m spacy download en_core_web_sm && \
    python3 -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('spaCy model loaded successfully.')" \
    || (echo "spaCy model download failed" && exit 1)
```

This ensures the model is installed during the Docker build, not at runtime.

## Verification

After applying the fix, test the connection:

```bash
# Check container logs
docker logs -f realtime-voice-chat-app

# You should see:
# ✅ "Client connected via WebSocket"
# ✅ "Created dedicated pipeline for connection"
# ✅ "Created dedicated audio processor for connection"

# NOT:
# ❌ "Downloading en_core_web_sm..."
# ❌ "OSError: [E050] Can't find model"
```

## Why This Happened

The Kokoro TTS engine (used in your server) requires spaCy for text processing:

```python
# In kokoro/pipeline.py line 113:
self.g2p = en.G2P(trf=trf, british=lang_code=='b', fallback=fallback, unk='')

# Which calls misaki/en.py line 503:
self.nlp = spacy.load(name, enable=components)  # ← Fails here!
```

When you switched to per-connection pipelines, each new connection tries to create a new Kokoro engine, which tries to load spaCy, which fails because it's not installed.

## Timeline

1. **Before:** Shared pipeline was created once at startup (model installed once)
2. **After:** Per-connection pipelines create new instances (model needed for each)
3. **Problem:** Model not pre-installed in Docker image
4. **Solution:** Pre-install model during Docker build

## Recommended Action

**Use Option 2 (Quick Fix) immediately to unblock testing, then do Option 1 (Rebuild) for production.**

```bash
# Quick fix NOW (5 minutes):
docker exec -it realtime-voice-chat-app python3 -m spacy download en_core_web_sm
docker restart realtime-voice-chat-app

# Proper fix LATER (30 minutes):
# 1. Rebuild Docker image with updated Dockerfile
# 2. Push to registry
# 3. Deploy to EC2
```

## After Fix

Once fixed, you should be able to:

- ✅ Connect multiple users simultaneously
- ✅ Each user gets their own pipeline
- ✅ No crashes or model download errors
- ✅ Fast response times (~1s per user)

## Need Help?

If the quick fix doesn't work:

1. Check if spaCy is installed:

   ```bash
   docker exec realtime-voice-chat-app pip list | grep spacy
   ```

2. Check Python version:

   ```bash
   docker exec realtime-voice-chat-app python3 --version
   ```

3. Try installing with pip instead:

   ```bash
   docker exec realtime-voice-chat-app pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl
   ```

4. Check container logs for other errors:
   ```bash
   docker logs realtime-voice-chat-app --tail 100
   ```
