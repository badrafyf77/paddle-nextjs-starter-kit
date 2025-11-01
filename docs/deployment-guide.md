# Voice Chat Server Deployment Guide

## Changes Made

✅ **Per-Connection Pipelines Implemented**

- Each WebSocket connection now gets its own `SpeechPipelineManager`
- Each connection gets its own `AudioInputProcessor`
- True isolation between users - no more shared state
- Concurrent processing on GPU

## Pre-Deployment Checklist

### 1. Test Locally First

```bash
# Navigate to your voice chat directory
cd docs/RealtimeVoiceChat/code

# Test the server
python server.py
```

**Expected output:**

```
🖥️✅ Server initialized - pipelines will be created per-connection for true isolation
🖥️▶️ Starting server without SSL.
```

### 2. Test with Multiple Connections

Open 2-3 browser tabs and connect simultaneously. You should see:

```
🖥️✅ Client connected via WebSocket (Connection ID: 140...)
🖥️🔧 Created dedicated pipeline for connection 140...
🖥️🎤 Created dedicated audio processor for connection 140...
```

Each connection should have a different ID and its own pipeline.

---

## Deployment to AWS EC2

### Step 1: Connect to Your EC2 Instance

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Or if using EC2 Instance Connect
aws ec2-instance-connect ssh --instance-id i-xxxxx
```

### Step 2: Backup Current Server

```bash
# Navigate to your voice chat directory
cd /path/to/voice-chat

# Backup current server.py
cp server.py server.py.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -lh server.py*
```

### Step 3: Upload New Server File

**Option A: Using SCP (from your local machine)**

```bash
scp -i your-key.pem docs/RealtimeVoiceChat/code/server.py ubuntu@your-ec2-ip:/path/to/voice-chat/
```

**Option B: Using Git (recommended)**

```bash
# On your local machine
cd paddle-nextjs-starter-kit
git add docs/RealtimeVoiceChat/code/server.py
git commit -m "feat: implement per-connection pipelines for better performance"
git push

# On EC2 instance
cd /path/to/voice-chat
git pull
```

**Option C: Copy-Paste**

```bash
# On EC2, edit the file
nano server.py

# Copy the content from your local server.py and paste
# Save with Ctrl+X, Y, Enter
```

### Step 4: Restart the Service

**If using systemd service:**

```bash
sudo systemctl restart voice-chat
sudo systemctl status voice-chat

# Check logs
sudo journalctl -u voice-chat -f
```

**If using screen/tmux:**

```bash
# Find the screen session
screen -ls

# Attach to it
screen -r voice-chat

# Stop the server (Ctrl+C)
# Start it again
python server.py

# Detach with Ctrl+A, D
```

**If using PM2:**

```bash
pm2 restart voice-chat
pm2 logs voice-chat
```

### Step 5: Verify Deployment

```bash
# Check if server is running
curl http://localhost:8000/

# Check WebSocket endpoint
wscat -c ws://localhost:8000/ws

# Monitor logs
tail -f /var/log/voice-chat.log  # or wherever your logs are
```

---

## Monitoring Performance

### Install Monitoring Tools (if not already installed)

```bash
# Install htop for CPU/RAM monitoring
sudo apt-get update
sudo apt-get install -y htop

# Install nvidia-smi for GPU monitoring (should already be there)
nvidia-smi

# Install Python monitoring packages
pip install psutil gputil
```

### Monitor in Real-Time

**Terminal 1: Server Logs**

```bash
tail -f /var/log/voice-chat.log
# or
journalctl -u voice-chat -f
```

**Terminal 2: GPU Monitoring**

```bash
watch -n 1 nvidia-smi
```

**Terminal 3: System Resources**

```bash
htop
```

### What to Look For

**Good Signs:**

- Multiple "Created dedicated pipeline for connection" messages
- GPU utilization: 60-80%
- Memory usage stable
- TTS latency < 1 second per user

**Bad Signs:**

- "Audio queue full" warnings
- GPU utilization < 30% or > 95%
- Memory constantly increasing (memory leak)
- TTS latency > 2 seconds

---

## Performance Testing

### Test Script

Create `test_concurrent_users.py` on your local machine:

```python
import asyncio
import websockets
import json
import time
import struct

async def test_user(user_id: int, server_url: str):
    """Simulate a single user connection"""
    uri = f"ws://{server_url}/ws"

    try:
        async with websockets.connect(uri) as ws:
            print(f"User {user_id}: Connected")

            # Send a test audio packet
            timestamp_ms = int(time.time() * 1000)
            flags = 0
            header = struct.pack("!II", timestamp_ms, flags)

            # Dummy PCM audio (silence)
            pcm_data = b'\x00' * 1920  # 20ms of silence at 48kHz

            start_time = time.time()
            await ws.send(header + pcm_data)

            # Wait for response
            response_count = 0
            async for message in ws:
                if isinstance(message, str):
                    data = json.loads(message)
                    if data.get("type") == "tts_chunk":
                        response_count += 1
                        if response_count == 1:
                            latency = time.time() - start_time
                            print(f"User {user_id}: First TTS chunk in {latency:.2f}s")
                        if response_count >= 5:
                            break

            print(f"User {user_id}: Completed")

    except Exception as e:
        print(f"User {user_id}: Error - {e}")

async def load_test(num_users: int, server_url: str):
    """Run concurrent user test"""
    print(f"\n🧪 Testing with {num_users} concurrent users...")
    print(f"🎯 Target: {server_url}\n")

    start = time.time()
    tasks = [test_user(i, server_url) for i in range(num_users)]
    await asyncio.gather(*tasks)
    duration = time.time() - start

    print(f"\n✅ Test completed in {duration:.2f}s")
    print(f"📊 Average time per user: {duration/num_users:.2f}s")

if __name__ == "__main__":
    # Replace with your EC2 public IP
    SERVER_URL = "your-ec2-ip:8000"

    # Test with increasing load
    for num_users in [2, 5, 8]:
        asyncio.run(load_test(num_users, SERVER_URL))
        time.sleep(5)  # Wait between tests
```

### Run the Test

```bash
# Install websockets if needed
pip install websockets

# Run test
python test_concurrent_users.py
```

**Expected Results:**

- 2 users: ~1-2s per user
- 5 users: ~1-2s per user (should be similar!)
- 8 users: ~1-3s per user

**Before the fix, you'd see:**

- 2 users: ~3-5s per user
- 5 users: ~10-15s per user (terrible!)

---

## Troubleshooting

### Issue: "CUDA out of memory"

**Solution:** Reduce concurrent connections or upgrade instance

```python
# Add connection limit in server.py
MAX_CONNECTIONS = 8
active_connections = 0

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    global active_connections

    if active_connections >= MAX_CONNECTIONS:
        await ws.close(code=1008, reason="Server at capacity")
        return

    active_connections += 1
    try:
        # ... rest of your code
    finally:
        active_connections -= 1
```

### Issue: Server crashes on disconnect

**Check:** Cleanup code is running properly

```bash
# Look for these in logs:
grep "Cleaning up connection" /var/log/voice-chat.log
grep "Cleaned up pipeline" /var/log/voice-chat.log
```

### Issue: Still slow with multiple users

**Debug steps:**

1. Check GPU utilization: `nvidia-smi`
2. Check if pipelines are truly separate:
   ```bash
   grep "Created dedicated pipeline" /var/log/voice-chat.log | wc -l
   # Should equal number of connections
   ```
3. Check for queue overflow:
   ```bash
   grep "Audio queue full" /var/log/voice-chat.log
   ```

---

## Rollback Plan

If something goes wrong:

```bash
# Stop the service
sudo systemctl stop voice-chat

# Restore backup
cp server.py.backup.YYYYMMDD_HHMMSS server.py

# Restart service
sudo systemctl start voice-chat

# Verify
sudo systemctl status voice-chat
```

---

## Next Steps After Deployment

1. **Monitor for 24 hours**
   - Check logs every few hours
   - Monitor GPU/CPU/RAM usage
   - Test with real users

2. **Optimize if needed**
   - Adjust `MAX_AUDIO_QUEUE_SIZE` if seeing drops
   - Add connection limits if hitting VRAM limits
   - Consider downgrading to g5.xlarge to save costs

3. **Set up alerts**

   ```bash
   # CloudWatch alarms for:
   # - CPU > 80%
   # - GPU Memory > 90%
   # - Error rate > 5%
   ```

4. **Document your findings**
   - Note max concurrent users achieved
   - Record average latency
   - Track cost per user

---

## Cost Optimization

After confirming it works well:

### Switch to Spot Instance

```bash
# Create spot instance request
aws ec2 request-spot-instances \
  --instance-count 1 \
  --type "persistent" \
  --launch-specification file://spot-config.json

# Save 70% on costs!
```

### Consider g5.xlarge

If handling < 10 users comfortably:

- Same GPU as g5.2xlarge
- Half the cost
- 4 vCPUs still plenty for async workload

---

## Support

If you encounter issues:

1. Check logs first: `journalctl -u voice-chat -f`
2. Verify GPU is working: `nvidia-smi`
3. Test locally before blaming deployment
4. Check security groups allow port 8000
5. Verify WebSocket connections aren't being blocked

**Common fixes:**

- Restart service: `sudo systemctl restart voice-chat`
- Clear GPU memory: `sudo fuser -k /dev/nvidia*`
- Check disk space: `df -h`
- Check memory: `free -h`
