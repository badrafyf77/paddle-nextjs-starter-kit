# server_per_connection.py
# Modified version with per-connection SpeechPipelineManager
# This ensures each user gets their own isolated conversation context

# Add this at the top of the WebSocket endpoint section (around line 960)

# Store pipeline configuration globally (not the pipeline itself)
PIPELINE_CONFIG = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the application's lifespan, initializing shared resources.
    Note: SpeechPipelineManager is now created per-connection, not globally.
    """
    logger.info("🖥️▶️ Server starting up")
    
    # Log LLM configuration
    if LLM_START_PROVIDER == "bedrock":
        logger.info(f"🖥️⚙️ {Colors.apply('[LLM]').blue} Using Bedrock Agent: {Colors.apply(BEDROCK_AGENT_ID).blue}")
        logger.info(f"🖥️⚙️ {Colors.apply('[LLM]').blue} Bedrock Region: {Colors.apply(BEDROCK_REGION).blue}")
    else:
        logger.info(f"🖥️⚙️ {Colors.apply('[LLM]').blue} Provider: {Colors.apply(LLM_START_PROVIDER).blue}, Model: {Colors.apply(LLM_START_MODEL).blue}")
    
    # Store pipeline configuration (not the pipeline itself)
    global PIPELINE_CONFIG
    PIPELINE_CONFIG = {
        "tts_engine": TTS_START_ENGINE,
        "llm_provider": LLM_START_PROVIDER,
        "llm_model": LLM_START_MODEL,
        "no_think": NO_THINK,
        "orpheus_model": TTS_ORPHEUS_MODEL,
    }
    
    # Add Bedrock-specific parameters if using Bedrock
    if LLM_START_PROVIDER == "bedrock":
        PIPELINE_CONFIG.update({
            "bedrock_agent_id": BEDROCK_AGENT_ID,
            "bedrock_agent_alias_id": BEDROCK_AGENT_ALIAS_ID,
            "bedrock_region": BEDROCK_REGION,
        })
    
    # Only initialize shared components (Upsampler)
    app.state.Upsampler = UpsampleOverlap()
    
    # Note: AudioInputProcessor and SpeechPipelineManager are now created per-connection
    
    yield

    logger.info("🖥️⏹️ Server shutting down")


# Modified WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    Handles the main WebSocket connection for real-time voice chat.
    Creates isolated SpeechPipelineManager and AudioInputProcessor per connection.
    """
    await ws.accept()
    connection_id = id(ws)  # Unique ID for this connection
    logger.info(f"🖥️✅ Client connected via WebSocket (Connection ID: {connection_id})")

    # Create per-connection SpeechPipelineManager
    pipeline_manager = SpeechPipelineManager(**PIPELINE_CONFIG)
    logger.info(f"🖥️🔧 Created isolated pipeline for connection {connection_id}")
    
    # Create per-connection AudioInputProcessor
    audio_processor = AudioInputProcessor(
        LANGUAGE,
        is_orpheus=TTS_START_ENGINE=="orpheus",
        pipeline_latency=pipeline_manager.full_output_pipeline_latency / 1000,
    )
    logger.info(f"🖥️🎤 Created isolated audio processor for connection {connection_id}")

    message_queue = asyncio.Queue()
    audio_chunks = asyncio.Queue()

    # Create connection-specific state holder
    class ConnectionState:
        def __init__(self):
            self.pipeline_manager = pipeline_manager
            self.audio_processor = audio_processor
            self.upsampler = app.state.Upsampler  # Shared (stateless)
    
    conn_state = ConnectionState()

    # Set up callback manager with connection-specific state
    callbacks = TranscriptionCallbacks(conn_state, message_queue)

    # Assign callbacks to THIS connection's AudioInputProcessor
    audio_processor.realtime_callback = callbacks.on_partial
    audio_processor.transcriber.potential_sentence_end = callbacks.on_potential_sentence
    audio_processor.transcriber.on_tts_allowed_to_synthesize = callbacks.on_tts_allowed_to_synthesize
    audio_processor.transcriber.potential_full_transcription_callback = callbacks.on_potential_final
    audio_processor.transcriber.potential_full_transcription_abort_callback = callbacks.on_potential_abort
    audio_processor.transcriber.full_transcription_callback = callbacks.on_final
    audio_processor.transcriber.before_final_sentence = callbacks.on_before_final
    audio_processor.recording_start_callback = callbacks.on_recording_start
    audio_processor.silence_active_callback = callbacks.on_silence_active

    # Assign callback to THIS connection's SpeechPipelineManager
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
    finally:
        logger.info(f"🖥️🧹 Cleaning up connection {connection_id}...")
        
        # Clean up connection-specific resources
        audio_processor.shutdown()
        
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info(f"🖥️❌ WebSocket session {connection_id} ended.")


# Modified helper functions to use connection state instead of app.state

async def process_incoming_data(ws: WebSocket, conn_state, incoming_chunks: asyncio.Queue, callbacks) -> None:
    """Modified to use connection-specific state"""
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
                    "client_sent_ms": timestamp_ms,
                    "client_sent": client_sent_ns,
                    "client_sent_formatted": format_timestamp_ns(client_sent_ns),
                    "isTTSPlaying": bool(flags & 1),
                }

                server_ns = time.time_ns()
                metadata["server_received"] = server_ns
                metadata["server_received_formatted"] = format_timestamp_ns(server_ns)
                metadata["pcm"] = raw[8:]

                current_qsize = incoming_chunks.qsize()
                if current_qsize < MAX_AUDIO_QUEUE_SIZE:
                    await incoming_chunks.put(metadata)
                else:
                    logger.warning(f"🖥️⚠️ Audio queue full ({current_qsize}/{MAX_AUDIO_QUEUE_SIZE}); dropping chunk.")

            elif "text" in msg and msg["text"]:
                data = parse_json_message(msg["text"])
                msg_type = data.get("type")
                logger.info(Colors.apply(f"🖥️📥 ←←Client: {data}").orange)

                if msg_type == "tts_start":
                    callbacks.tts_client_playing = True
                elif msg_type == "tts_stop":
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

    except asyncio.CancelledError:
        pass
    except WebSocketDisconnect as e:
        logger.warning(f"🖥️⚠️ disconnect in process_incoming_data: {repr(e)}")
    except Exception as e:
        logger.exception(f"🖥️💥 exception in process_incoming_data: {repr(e)}")


async def send_tts_chunks(conn_state, message_queue: asyncio.Queue, callbacks) -> None:
    """Modified to use connection-specific state"""
    try:
        logger.info("🖥️🔊 Starting TTS chunk sender")
        last_quick_answer_chunk = 0
        last_chunk_sent = 0
        prev_status = None

        while True:
            await asyncio.sleep(0.001)

            if conn_state.audio_processor.interrupted and callbacks.interruption_time and time.time() - callbacks.interruption_time > 2.0:
                conn_state.audio_processor.interrupted = False
                callbacks.interruption_time = 0

            is_tts_finished = conn_state.pipeline_manager.is_valid_gen() and conn_state.pipeline_manager.running_generation.audio_quick_finished

            if not callbacks.tts_to_client:
                await asyncio.sleep(0.001)
                continue

            if not conn_state.pipeline_manager.running_generation:
                await asyncio.sleep(0.001)
                continue

            if conn_state.pipeline_manager.running_generation.abortion_started:
                await asyncio.sleep(0.001)
                continue

            if not conn_state.pipeline_manager.running_generation.audio_quick_finished:
                conn_state.pipeline_manager.running_generation.tts_quick_allowed_event.set()

            if not conn_state.pipeline_manager.running_generation.quick_answer_first_chunk_ready:
                await asyncio.sleep(0.001)
                continue

            chunk = None
            try:
                chunk = conn_state.pipeline_manager.running_generation.audio_chunks.get_nowait()
                if chunk:
                    last_quick_answer_chunk = time.time()
            except Empty:
                final_expected = conn_state.pipeline_manager.running_generation.quick_answer_provided
                audio_final_finished = conn_state.pipeline_manager.running_generation.audio_final_finished

                if not final_expected or audio_final_finished:
                    callbacks.send_final_assistant_answer()
                    conn_state.pipeline_manager.running_generation = None
                    callbacks.tts_chunk_sent = False
                    callbacks.reset_state()

                await asyncio.sleep(0.001)
                continue

            base64_chunk = conn_state.upsampler.get_base64_chunk(chunk)
            message_queue.put_nowait({
                "type": "tts_chunk",
                "content": base64_chunk
            })
            last_chunk_sent = time.time()

            if not callbacks.tts_chunk_sent:
                asyncio.create_task(_reset_interrupt_flag_async(conn_state.audio_processor, callbacks))

            callbacks.tts_chunk_sent = True

    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.exception(f"🖥️💥 exception in send_tts_chunks: {repr(e)}")


async def _reset_interrupt_flag_async(audio_processor, callbacks):
    """Modified to use connection-specific audio processor"""
    await asyncio.sleep(1)
    if audio_processor.interrupted:
        logger.info(f"{Colors.apply('🖥️🎙️ ▶️ Microphone continued (async reset)').cyan}")
        audio_processor.interrupted = False
        callbacks.interruption_time = 0


# Modified TranscriptionCallbacks to use connection state
class TranscriptionCallbacks:
    def __init__(self, conn_state, message_queue: asyncio.Queue):
        self.conn_state = conn_state  # Store connection state instead of app
        self.message_queue = message_queue
        # ... rest of initialization stays the same
        
    # Update all methods that reference self.app.state to use self.conn_state
    # For example:
    def on_potential_sentence(self, txt: str):
        self.conn_state.pipeline_manager.prepare_generation(txt)
    
    # ... etc for all other methods
