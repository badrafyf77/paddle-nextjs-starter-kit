# Current Status & Issues

## ✅ What's Working

1. **Per-Connection Pipelines** - Each user gets isolated conversation
2. **Model Pre-Warming** - Server startup loads models once (60s)
3. **Loading States** - UI shows initialization progress
4. **Start Button Spinner** - Button shows loading while connecting and waiting for server ready

## ⚠️ Current Issues

### 1. STT is Very Slow

**Symptom:** Real-time transcription takes seconds to appear, not instant like before

**Possible Causes:**

1. **Whisper model loading per connection** - Each user loads Whisper (10s)
2. **GPU contention** - Multiple Whisper instances competing for GPU
3. **Audio processing queue** - Backlog of audio chunks
4. **Turn detection overhead** - Classification model slowing things down

**Need to investigate:**

- Check if Whisper is being loaded multiple times
- Monitor GPU usage during transcription
- Check audio queue sizes
- Profile the transcription pipeline

### 2. Connection Time Still Long

**Current:** 10-15 seconds per user connection
**Desired:** 2-3 seconds

**What's slow:**

- Whisper model initialization (even with pre-warming)
- TTS model initialization
- Turn detection model loading

## 🔍 Debugging STT Slowness

### Check Server Logs

```bash
docker logs -f realtime-voice-chat-app | grep -E "(faster_whi|transcribe|👂)"
```

Look for:

- How long Whisper takes to process audio
- If models are being loaded multiple times
- Audio queue warnings

### Check GPU Usage

```bash
# On EC2
watch -n 1 nvidia-smi
```

Look for:

- Multiple Whisper processes
- High memory usage
- GPU utilization spikes

### Test with Single User

1. Connect one user
2. Speak immediately
3. Measure time from speaking to seeing transcription
4. Should be < 500ms for real-time

### Test with Multiple Users

1. Connect two users
2. Both speak simultaneously
3. Check if one blocks the other
4. Check GPU usage

## 🎯 Potential Solutions for STT Slowness

### Option 1: Shared Whisper Model (Risky)

**Pros:**

- Only one Whisper instance
- Faster connections
- Less VRAM usage

**Cons:**

- Whisper may not be thread-safe
- Could cause transcription conflicts
- Needs careful state management

### Option 2: Whisper Model Pool

**Pros:**

- Pre-load 3-4 Whisper instances
- Assign one per connection
- Reuse when connection closes

**Cons:**

- More VRAM usage
- Complex pool management
- Still limited by pool size

### Option 3: Optimize Whisper Settings

**Current settings:**

```python
model="medium.en"
beam_size=3
```

**Try:**

```python
model="small.en"  # Faster, slightly less accurate
beam_size=1       # Faster beam search
```

### Option 4: Use Faster Whisper Backend

**Options:**

- faster-whisper with int8 quantization
- WhisperX (batched inference)
- Distil-Whisper (smaller, faster model)

## 📊 Performance Targets

### Connection Time

- **Current:** 10-15s
- **Target:** 2-3s
- **Gap:** Need to reduce by 80%

### STT Latency

- **Current:** 2-5s (slow!)
- **Target:** < 500ms (real-time)
- **Gap:** Need to reduce by 90%

### Concurrent Users

- **Current:** Unknown (not tested)
- **Target:** 8-10 users
- **Need:** Load testing

## 🚀 Next Steps

### Immediate (Fix STT)

1. **Profile the transcription pipeline**

   ```python
   import time
   start = time.time()
   # ... transcription code ...
   logger.info(f"Transcription took {time.time() - start:.2f}s")
   ```

2. **Check if Whisper is loaded multiple times**

   ```bash
   # Count Whisper processes
   ps aux | grep whisper | wc -l
   ```

3. **Try smaller Whisper model**

   ```python
   model="small.en"  # Instead of medium.en
   ```

4. **Reduce beam size**
   ```python
   beam_size=1  # Instead of 3
   ```

### Short-term (Optimize)

1. **Implement Whisper model pool**
2. **Add audio queue monitoring**
3. **Profile GPU usage**
4. **Load test with multiple users**

### Long-term (Refactor)

1. **Consider WhisperX or Distil-Whisper**
2. **Implement request batching**
3. **Add connection limits**
4. **Implement auto-scaling**

## 📝 Notes

- The pre-warming helps with LLM/TTS but not STT
- STT (Whisper) is the bottleneck now
- Need to profile to find exact cause
- May need to compromise on accuracy for speed

## 🔧 Quick Fixes to Try

### 1. Reduce Whisper Model Size

In `transcribe.py` or wherever Whisper is initialized:

```python
# Change from:
model="medium.en"

# To:
model="small.en"  # or even "tiny.en" for testing
```

### 2. Reduce Beam Size

```python
# Change from:
beam_size=3

# To:
beam_size=1
```

### 3. Disable VAD Filter (if enabled)

```python
# Change from:
faster_whisper_vad_filter=True

# To:
faster_whisper_vad_filter=False
```

### 4. Increase Audio Queue Size

In `server.py`:

```python
# Change from:
MAX_AUDIO_QUEUE_SIZE = 50

# To:
MAX_AUDIO_QUEUE_SIZE = 100
```

## 🎬 Conclusion

The architecture is solid for multiple users, but STT performance needs optimization. The slowness is likely from:

1. Whisper model being too large (medium.en)
2. Multiple Whisper instances competing for GPU
3. Beam search being too thorough (beam_size=3)

Try the quick fixes above and monitor the results!
