"""
INTEGRATION PATCH: Add these sections to your server.py

This file shows exactly what to add to enable professional performance monitoring.
"""

# ============================================================================
# 1. ADD THESE IMPORTS AT THE TOP (after existing imports)
# ============================================================================

from performance_monitor import get_monitor
from performance_integration import PerformanceTracker

# ============================================================================
# 2. ADD THESE API ENDPOINTS (before the WebSocket endpoint)
# ============================================================================

@app.get("/api/performance")
async def get_performance():
    """
    API endpoint for performance metrics.
    Returns comprehensive performance data for the dashboard.
    """
    monitor = get_monitor()
    monitor.update_system_metrics()
    return monitor.get_summary()

@app.get("/dashboard")
async def get_dashboard():
    """
    Serve the performance monitoring dashboard.
    Access at http://localhost:8000/dashboard
    """
    with open("performance_dashboard.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

# ============================================================================
# 3. MODIFY THE WEBSOCKET ENDPOINT - Add tracking
# ============================================================================

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    Handles the main WebSocket connection for real-time voice chat.
    NOW WITH PERFORMANCE MONITORING!
    """
    await ws.accept()
    connection_id = str(id(ws))  # Convert to string for tracking
    logger.info(f"🖥️✅ Client connected via WebSocket (Connection ID: {connection_id})")

    # ===== ADD: Start performance tracking =====
    monitor = get_monitor()
    monitor.start_connection(connection_id)
    tracker = PerformanceTracker(connection_id)
    # ===========================================

    message_queue = asyncio.Queue()
    audio_chunks = asyncio.Queue()
    
    # ... existing code for sending status, creating pipeline, etc. ...
    
    # Send "initializing" status to client
    await ws.send_json({
        "type": "status",
        "status": "initializing",
        "message": "Setting up your interview session..."
    })
    
    # Create DEDICATED pipeline manager for this connection
    logger.info(f"🖥️🔧 Creating pipeline for connection {connection_id}...")
    pipeline_manager = SpeechPipelineManager(**app.state.PIPELINE_CONFIG)
    logger.info(f"🖥️✅ Pipeline ready for connection {connection_id}")
    
    # Create DEDICATED audio processor for this connection
    audio_processor = AudioInputProcessor(
        LANGUAGE,
        is_orpheus=TTS_START_ENGINE=="orpheus",
        pipeline_latency=pipeline_manager.full_output_pipeline_latency / 1000,
    )
    logger.info(f"🖥️🎤 Created dedicated audio processor for connection {connection_id}")
    
    # Send "ready" status to client
    await ws.send_json({
        "type": "status",
        "status": "ready",
        "message": "Interview session ready! You can start speaking now."
    })
    logger.info(f"🖥️✅ Connection {connection_id} is ready for audio")

    # Create connection state holder
    class ConnectionState:
        def __init__(self):
            self.pipeline_manager = pipeline_manager
            self.audio_processor = audio_processor
            self.upsampler = app.state.Upsampler
            self.conversation_history = []
            # ===== ADD: Store tracker in connection state =====
            self.tracker = tracker
            # ==================================================
    
    conn_state = ConnectionState()

    # Set up callback manager with connection-specific state
    callbacks = TranscriptionCallbacks(conn_state, message_queue)

    # ... existing callback assignments ...
    audio_processor.realtime_callback = callbacks.on_partial
    audio_processor.transcriber.potential_sentence_end = callbacks.on_potential_sentence
    audio_processor.transcriber.on_tts_allowed_to_synthesize = callbacks.on_tts_allowed_to_synthesize
    audio_processor.transcriber.potential_full_transcription_callback = callbacks.on_potential_final
    audio_processor.transcriber.potential_full_transcription_abort_callback = callbacks.on_potential_abort
    audio_processor.transcriber.full_transcription_callback = callbacks.on_final
    audio_processor.transcriber.before_final_sentence = callbacks.on_before_final
    audio_processor.recording_start_callback = callbacks.on_recording_start
    audio_processor.silence_active_callback = callbacks.on_silence_active
    pipeline_manager.on_partial_assistant_text = callbacks.on_partial_assistant_text

    # Create tasks for handling different responsibilities
    tasks = [
        asyncio.create_task(process_incoming_data(ws, conn_state, audio_chunks, callbacks)),
        asyncio.create_task(audio_processor.process_chunk_queue(audio_chunks)),
        asyncio.create_task(send_text_messages(ws, message_queue)),
        asyncio.create_task(send_tts_chunks(conn_state, message_queue, callbacks)),
    ]

    try:
        # Wait for any task to complete (e.g., client disconnect)
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            if not task.done():
                task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
    except Exception as e:
        logger.error(f"🖥️💥 {Colors.apply('ERROR').red} in WebSocket session {connection_id}: {repr(e)}")
        # ===== ADD: Track errors =====
        tracker.record_error("websocket_disconnects")
        # =============================
    finally:
        logger.info(f"🖥️🧹 Cleaning up connection {connection_id}...")
        
        # ===== ADD: End performance tracking =====
        monitor.end_connection(connection_id)
        # =========================================
        
        # ... existing cleanup code ...
        conn_state.conversation_history = []
        
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        
        try:
            if pipeline_manager.running_generation:
                pipeline_manager.abort_generation(reason="Connection closed")
            pipeline_manager.history = []
            audio_processor.interrupted = True
            logger.info(f"🖥️✅ Cleaned up pipeline and audio processor for connection {connection_id}")
        except Exception as e:
            logger.error(f"🖥️⚠️ Error during cleanup for connection {connection_id}: {e}")
        
        logger.info(f"🖥️❌ WebSocket session {connection_id} ended.")

# ============================================================================
# 4. ADD TRACKING TO process_incoming_data FUNCTION
# ============================================================================

async def process_incoming_data(ws: WebSocket, conn_state, incoming_chunks: asyncio.Queue, callbacks: 'TranscriptionCallbacks') -> None:
    """
    Receives messages via WebSocket, processes audio and text messages.
    NOW WITH PERFORMANCE TRACKING!
    """
    try:
        while True:
            msg = await ws.receive()
            if "bytes" in msg and msg["bytes"]:
                raw = msg["bytes"]

                if len(raw) < 8:
                    logger.warning("🖥️⚠️ Received packet too short for 8‑byte header.")
                    continue

                timestamp_ms, flags = struct.unpack("!II", raw[:8])
                client_sent_ns = timestamp_ms * 1_000_000

                metadata = {
                    "client_sent_ms":           timestamp_ms,
                    "client_sent":              client_sent_ns,
                    "client_sent_formatted":    format_timestamp_ns(client_sent_ns),
                    "isTTSPlaying":             bool(flags & 1),
                }

                server_ns = time.time_ns()
                metadata["server_received"] = server_ns
                metadata["server_received_formatted"] = format_timestamp_ns(server_ns)
                metadata["pcm"] = raw[8:]

                # ===== ADD: Track audio capture latency =====
                latency_ms = (server_ns - client_sent_ns) / 1_000_000
                conn_state.tracker.record_latency(conn_state.tracker.conn_id, "audio_capture_to_server", latency_ms)
                conn_state.tracker.record_audio(len(raw[8:]))
                # ============================================

                current_qsize = incoming_chunks.qsize()
                if current_qsize < MAX_AUDIO_QUEUE_SIZE:
                    await incoming_chunks.put(metadata)
                else:
                    logger.warning(
                        f"🖥️⚠️ Audio queue full ({current_qsize}/{MAX_AUDIO_QUEUE_SIZE}); dropping chunk. Possible lag."
                    )
                    # ===== ADD: Track queue overflow =====
                    conn_state.tracker.record_error("queue_overflows")
                    # =====================================

            elif "text" in msg and msg["text"]:
                data = parse_json_message(msg["text"])
                msg_type = data.get("type")
                logger.info(Colors.apply(f"🖥️📥 ←←Client: {data}").orange)

                if msg_type == "tts_start":
                    logger.info("🖥️ℹ️ Received tts_start from client.")
                    callbacks.tts_client_playing = True
                elif msg_type == "tts_stop":
                    logger.info("🖥️ℹ️ Received tts_stop from client.")
                    callbacks.tts_client_playing = False
                elif msg_type == "clear_history":
                    logger.info("🖥️ℹ️ Received clear_history from client.")
                    conn_state.pipeline_manager.reset()
                elif msg_type == "set_speed":
                    speed_value = data.get("speed", 0)
                    speed_factor = speed_value / 100.0
                    turn_detection = conn_state.audio_processor.transcriber.turn_detection
                    if turn_detection:
                        turn_detection.update_settings(speed_factor)
                        logger.info(f"🖥️⚙️ Updated turn detection settings to factor: {speed_factor:.2f}")

    except asyncio.CancelledError:
        pass
    except WebSocketDisconnect as e:
        logger.warning(f"🖥️⚠️ {Colors.apply('WARNING').red} disconnect in process_incoming_data: {repr(e)}")
        # ===== ADD: Track disconnect =====
        conn_state.tracker.record_error("websocket_disconnects")
        # =================================
    except RuntimeError as e:
        logger.error(f"🖥️💥 {Colors.apply('RUNTIME_ERROR').red} in process_incoming_data: {repr(e)}")
    except Exception as e:
        logger.exception(f"🖥️💥 {Colors.apply('EXCEPTION').red} in process_incoming_data: {repr(e)}")

# ============================================================================
# 5. ADD TRACKING TO TranscriptionCallbacks CLASS
# ============================================================================

class TranscriptionCallbacks:
    """
    Manages state and callbacks for a single WebSocket connection's transcription lifecycle.
    NOW WITH PERFORMANCE TRACKING!
    """
    def __init__(self, conn_state, message_queue: asyncio.Queue):
        self.conn_state = conn_state
        self.message_queue = message_queue
        # ... existing initialization ...
        
        # ===== ADD: Track timing for end-to-end latency =====
        self.user_speech_end_time = None
        self.first_audio_play_time = None
        # ====================================================
        
        # ... rest of existing initialization ...

    def on_before_final(self, audio: bytes, txt: str):
        """
        Callback invoked just before the final STT result for a user turn is confirmed.
        NOW WITH PERFORMANCE TRACKING!
        """
        # ===== ADD: Mark when user finished speaking =====
        self.user_speech_end_time = time.time()
        # =================================================
        
        logger.info(Colors.apply('🖥️🏁 =================== USER TURN END ===================').light_gray)
        self.user_finished_turn = True
        self.user_interrupted = False
        
        # ... existing code ...
        
        if self.conn_state.pipeline_manager.is_valid_gen():
            logger.info(f"{Colors.apply('🖥️🔊 TTS ALLOWED (before final)').blue}")
            self.conn_state.pipeline_manager.running_generation.tts_quick_allowed_event.set()

        if not self.conn_state.audio_processor.interrupted:
            logger.info(f"{Colors.apply('🖥️🎙️ ⏸️ Microphone interrupted (end of turn)').cyan}")
            self.conn_state.audio_processor.interrupted = True
            self.interruption_time = time.time()

        logger.info(f"{Colors.apply('🖥️🔊 TTS STREAM RELEASED').blue}")
        self.tts_to_client = True

        user_request_content = self.final_transcription if self.final_transcription else self.partial_transcription
        self.message_queue.put_nowait({
            "type": "final_user_request",
            "content": user_request_content
        })

        if self.conn_state.pipeline_manager.is_valid_gen():
            if self.conn_state.pipeline_manager.running_generation.quick_answer and not self.user_interrupted:
                self.assistant_answer = self.conn_state.pipeline_manager.running_generation.quick_answer
                self.message_queue.put_nowait({
                    "type": "partial_assistant_answer",
                    "content": self.assistant_answer
                })

        logger.info(f"🖥️🧠 Adding user request to history: '{user_request_content}'")
        self.conn_state.conversation_history.append({"role": "user", "content": user_request_content})
        self.conn_state.pipeline_manager.history = self.conn_state.conversation_history
        
        # ===== ADD: Track turn completion =====
        self.conn_state.tracker.record_turn_complete()
        # ======================================

    def on_recording_start(self):
        """
        Callback invoked when the audio input processor starts recording user speech.
        NOW WITH PERFORMANCE TRACKING!
        """
        logger.info(f"{Colors.ORANGE}🖥️🎙️ Recording started.{Colors.RESET} TTS Client Playing: {self.tts_client_playing}")
        
        if self.tts_client_playing:
            # ===== ADD: Track interruption =====
            self.conn_state.tracker.record_interruption()
            # ===================================
            
            self.tts_to_client = False
            self.user_interrupted = True
            logger.info(f"{Colors.apply('🖥️❗ INTERRUPTING TTS due to recording start').blue}")

            # ... existing interruption handling code ...
            
            logger.info(Colors.apply("🖥️✅ Sending final assistant answer (forced on interruption)").pink)
            self.send_final_assistant_answer(forced=True)

            self.tts_chunk_sent = False

            logger.info("🖥️🛑 Sending stop_tts to client.")
            self.message_queue.put_nowait({
                "type": "stop_tts",
                "content": ""
            })

            logger.info(f"{Colors.apply('🖥️🛑 RECORDING START ABORTING GENERATION').red}")
            self.abort_generations("on_recording_start, user interrupts, TTS Playing")

            logger.info("🖥️❗ Sending tts_interruption to client.")
            self.message_queue.put_nowait({
                "type": "tts_interruption",
                "content": ""
            })

    def on_partial_assistant_text(self, txt: str):
        """
        Callback invoked when a partial text result from the assistant (LLM) is available.
        NOW WITH PERFORMANCE TRACKING!
        """
        logger.info(f"{Colors.apply('🖥️💬 PARTIAL ASSISTANT ANSWER: ').green}{txt}")
        
        # ===== ADD: Track text generation =====
        self.conn_state.tracker.record_text(len(txt))
        # ======================================
        
        if not self.user_interrupted:
            self.assistant_answer = txt
            if self.tts_to_client:
                self.send_sentence_if_complete(txt)

# ============================================================================
# 6. ADD TRACKING TO AUDIO/LLM/TTS PROCESSING (in your pipeline modules)
# ============================================================================

# In your transcription code (transcribe.py or similar):
"""
def transcribe_audio(audio_data, conn_state):
    start_time = time.time()
    
    # ... your transcription code ...
    result = whisper_model.transcribe(audio_data)
    
    # Track transcription time
    latency_ms = (time.time() - start_time) * 1000
    conn_state.tracker.record_latency(
        conn_state.tracker.conn_id,
        "transcription_time",
        latency_ms
    )
    
    return result
"""

# In your LLM code (llm_module.py or similar):
"""
async def generate_llm_response(prompt, conn_state):
    start_time = time.time()
    first_token_time = None
    
    async for token in llm_stream(prompt):
        if first_token_time is None:
            first_token_time = time.time()
            # Track time to first token
            latency_ms = (first_token_time - start_time) * 1000
            conn_state.tracker.record_latency(
                conn_state.tracker.conn_id,
                "llm_first_token",
                latency_ms
            )
        
        yield token
    
    # Track total LLM time
    total_latency_ms = (time.time() - start_time) * 1000
    conn_state.tracker.record_latency(
        conn_state.tracker.conn_id,
        "llm_total_time",
        total_latency_ms
    )
"""

# In your TTS code (audio_module.py or similar):
"""
def generate_tts(text, conn_state):
    start_time = time.time()
    first_chunk_time = None
    
    for chunk in tts_engine.synthesize(text):
        if first_chunk_time is None:
            first_chunk_time = time.time()
            # Track time to first chunk
            latency_ms = (first_chunk_time - start_time) * 1000
            conn_state.tracker.record_latency(
                conn_state.tracker.conn_id,
                "tts_first_chunk",
                latency_ms
            )
        
        # Track TTS throughput
        conn_state.tracker.record_tts(len(chunk))
        
        yield chunk
    
    # Track total TTS time
    total_latency_ms = (time.time() - start_time) * 1000
    conn_state.tracker.record_latency(
        conn_state.tracker.conn_id,
        "tts_total_time",
        total_latency_ms
    )
"""

# ============================================================================
# 7. ADD END-TO-END LATENCY TRACKING IN send_tts_chunks
# ============================================================================

async def send_tts_chunks(conn_state, message_queue: asyncio.Queue, callbacks: 'TranscriptionCallbacks') -> None:
    """
    Continuously sends TTS audio chunks from the SpeechPipelineManager to the client.
    NOW WITH END-TO-END LATENCY TRACKING!
    """
    try:
        logger.info("🖥️🔊 Starting TTS chunk sender")
        last_quick_answer_chunk = 0
        last_chunk_sent = 0
        prev_status = None

        while True:
            # ... existing code ...
            
            # When sending first chunk:
            chunk = None
            try:
                chunk = conn_state.pipeline_manager.running_generation.audio_chunks.get_nowait()
                if chunk:
                    last_quick_answer_chunk = time.time()
                    logger.info(f"🖥️🔊 got TTS chunk bytes={len(chunk)}")
                    
                    # ===== ADD: Track end-to-end latency on first chunk =====
                    if callbacks.user_speech_end_time and callbacks.first_audio_play_time is None:
                        callbacks.first_audio_play_time = time.time()
                        e2e_latency_ms = (callbacks.first_audio_play_time - callbacks.user_speech_end_time) * 1000
                        conn_state.tracker.record_latency(
                            conn_state.tracker.conn_id,
                            "end_to_end",
                            e2e_latency_ms
                        )
                        logger.info(f"📊 End-to-end latency: {e2e_latency_ms:.0f}ms")
                    # ========================================================
                    
            except Empty:
                # ... existing code ...
                pass
            
            # ... rest of existing code ...
            
    except Exception as e:
        logger.exception(f"🖥️💥 {Colors.apply('EXCEPTION').red} in send_tts_chunks: {repr(e)}")

# ============================================================================
# DONE! Now you have professional performance monitoring integrated.
# ============================================================================
