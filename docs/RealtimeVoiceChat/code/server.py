# server.py
from queue import Queue, Empty
import logging
from logsetup import setup_logging
setup_logging(logging.INFO)
logger = logging.getLogger(__name__)

# Clean logging helper - only show important events
def log_event(emoji: str, message: str, level: str = "info"):
    """Log important events in a clean, readable format"""
    if level == "info":
        logger.info(f"{emoji} {message}")
    elif level == "warning":
        logger.warning(f"{emoji} {message}")
    elif level == "error":
        logger.error(f"{emoji} {message}")

if __name__ == "__main__":
    log_event("🎙️", "Voice Chat Server Starting...")

from upsample_overlap import UpsampleOverlap
from datetime import datetime
from colors import Colors
import uvicorn
import asyncio
import struct
import json
import time
import threading # Keep threading for SpeechPipelineManager internals and AbortWorker
import sys
import os # Added for environment variable access

from typing import Any, Dict, Optional, Callable # Added for type hints in docstrings
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import HTMLResponse, Response, FileResponse

USE_SSL = False
# TTS_START_ENGINE = "orpheus"
TTS_START_ENGINE = "kokoro"
# TTS_START_ENGINE = "coqui"
TTS_ORPHEUS_MODEL = "Orpheus_3B-1BaseGGUF/mOrpheus_3B-1Base_Q4_K_M.gguf"
TTS_ORPHEUS_MODEL = "orpheus-3b-0.1-ft-Q8_0-GGUF/orpheus-3b-0.1-ft-q8_0.gguf"

# Import orpheus_prompt_addon for shared LLM initialization
from speech_pipeline_manager import orpheus_prompt_addon, system_prompt

# LLM Configuration - Can be overridden by environment variables
LLM_START_PROVIDER = os.getenv("LLM_PROVIDER", "vllm")  # Options: "vllm", "ollama", "openai", "lmstudio", "bedrock"
LLM_START_MODEL = os.getenv("LLM_MODEL", "Qwen/Qwen2.5-3B-Instruct")

# Bedrock-specific configuration (required when LLM_START_PROVIDER="bedrock")
BEDROCK_AGENT_ID = os.getenv("BEDROCK_AGENT_ID", "VUEHUL2HDK")
BEDROCK_AGENT_ALIAS_ID = os.getenv("BEDROCK_AGENT_ALIAS_ID", "JBU23UII65")
BEDROCK_REGION = os.getenv("BEDROCK_REGION", "us-west-2")

NO_THINK = False
DIRECT_STREAM = TTS_START_ENGINE=="orpheus"

# Global pipeline configuration (not the pipeline itself)
# Each WebSocket connection will create its own pipeline using this config
PIPELINE_CONFIG = {}

if __name__ == "__main__":
    logger.info(f"🖥️⚙️ {Colors.apply('[PARAM]').blue} Starting engine: {Colors.apply(TTS_START_ENGINE).blue}")
    logger.info(f"🖥️⚙️ {Colors.apply('[PARAM]').blue} Direct streaming: {Colors.apply('ON' if DIRECT_STREAM else 'OFF').blue}")

# Define the maximum allowed size for the incoming audio queue
try:
    MAX_AUDIO_QUEUE_SIZE = int(os.getenv("MAX_AUDIO_QUEUE_SIZE", 50))
    if __name__ == "__main__":
        logger.info(f"🖥️⚙️ {Colors.apply('[PARAM]').blue} Audio queue size limit set to: {Colors.apply(str(MAX_AUDIO_QUEUE_SIZE)).blue}")
except ValueError:
    if __name__ == "__main__":
        logger.warning("🖥️⚠️ Invalid MAX_AUDIO_QUEUE_SIZE env var. Using default: 50")
    MAX_AUDIO_QUEUE_SIZE = 50


if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

#from handlerequests import LanguageProcessor
#from audio_out import AudioOutProcessor
from audio_in import AudioInputProcessor
from speech_pipeline_manager import SpeechPipelineManager
from colors import Colors

LANGUAGE = "en"
# TTS_FINAL_TIMEOUT = 0.5 # unsure if 1.0 is needed for stability
TTS_FINAL_TIMEOUT = 1.0 # unsure if 1.0 is needed for stability

# --------------------------------------------------------------------
# Custom no-cache StaticFiles
# --------------------------------------------------------------------
class NoCacheStaticFiles(StaticFiles):
    """
    Serves static files without allowing client-side caching.

    Overrides the default Starlette StaticFiles to add 'Cache-Control' headers
    that prevent browsers from caching static assets. Useful for development.
    """
    async def get_response(self, path: str, scope: Dict[str, Any]) -> Response:
        """
        Gets the response for a requested path, adding no-cache headers.

        Args:
            path: The path to the static file requested.
            scope: The ASGI scope dictionary for the request.

        Returns:
            A Starlette Response object with cache-control headers modified.
        """
        response: Response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        # These might not be strictly necessary with no-store, but belt and suspenders
        if "etag" in response.headers:
             response.headers.__delitem__("etag")
        if "last-modified" in response.headers:
             response.headers.__delitem__("last-modified")
        return response

# --------------------------------------------------------------------
# Lifespan management
# --------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the application's lifespan, initializing shared resources.
    
    Initializes shared TTS engine, LLM client, and STT recorder that will be
    reused across all WebSocket connections to minimize memory usage and
    improve connection startup time.

    Args:
        app: The FastAPI application instance.
    """
    logger.info("🖥️▶️ Server starting up")
    
    # Log LLM configuration
    if LLM_START_PROVIDER == "bedrock":
        logger.info(f"🖥️⚙️ {Colors.apply('[LLM]').blue} Using Bedrock Agent: {Colors.apply(BEDROCK_AGENT_ID).blue}")
        logger.info(f"🖥️⚙️ {Colors.apply('[LLM]').blue} Bedrock Region: {Colors.apply(BEDROCK_REGION).blue}")
    else:
        logger.info(f"🖥️⚙️ {Colors.apply('[LLM]').blue} Provider: {Colors.apply(LLM_START_PROVIDER).blue}, Model: {Colors.apply(LLM_START_MODEL).blue}")
    
    # Store pipeline configuration globally (not the pipeline itself)
    # Each WebSocket connection will create its own pipeline using this config
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
    
    # Store configuration and stateless components
    app.state.PIPELINE_CONFIG = PIPELINE_CONFIG
    app.state.Upsampler = UpsampleOverlap()  # Stateless, can be shared
    
    # ============================================================================
    # NEW: Initialize SHARED resources (used by all connections)
    # ============================================================================
    logger.info("🖥️🔧 Initializing shared resources...")
    
    # 1. Shared TTS Engine and Stream
    logger.info(f"🖥️🔊 Initializing shared TTS engine: {TTS_START_ENGINE}")
    from audio_module import AudioProcessor
    shared_audio = AudioProcessor(
        engine=TTS_START_ENGINE,
        orpheus_model=TTS_ORPHEUS_MODEL,
        skip_prewarm=False  # Prewarm once at startup
    )
    app.state.shared_tts_engine = shared_audio.engine
    app.state.shared_tts_stream = shared_audio.stream
    # Store measured TTFA for later use
    app.state.shared_tts_stream._measured_ttfa = shared_audio.tts_inference_time
    logger.info(f"🖥️✅ Shared TTS engine initialized (TTFA: {shared_audio.tts_inference_time:.2f}ms)")
    
    # 2. Shared LLM Client (skip for Bedrock as it's session-based)
    if LLM_START_PROVIDER != "bedrock":
        logger.info(f"🖥️🧠 Initializing shared LLM client: {LLM_START_PROVIDER}")
        from llm_module import LLM
        
        # Build system prompt
        shared_system_prompt = system_prompt
        if TTS_START_ENGINE == "orpheus":
            shared_system_prompt += f"\n{orpheus_prompt_addon}"
        
        shared_llm = LLM(
            backend=LLM_START_PROVIDER,
            model=LLM_START_MODEL,
            system_prompt=shared_system_prompt,
            no_think=NO_THINK,
        )
        # Prewarm the LLM once
        shared_llm.prewarm()
        llm_inference_time = shared_llm.measure_inference_time()
        if llm_inference_time is not None:
            shared_llm._measured_inference_time = llm_inference_time
            logger.info(f"🖥️✅ Shared LLM client initialized (inference time: {llm_inference_time:.2f}ms)")
        else:
            shared_llm._measured_inference_time = 250.0
            logger.warning(f"🖥️⚠️ LLM inference time measurement failed, using default: 250ms")
        
        app.state.shared_llm = shared_llm
    else:
        app.state.shared_llm = None
        logger.info("🖥️ℹ️ Bedrock uses per-session LLM, skipping shared LLM initialization")
    
    # 3. Shared STT Recorder (WhisperModel)
    logger.info(f"🖥️🎙️ Initializing shared STT recorder (Whisper model)")
    from transcribe import TranscriptionProcessor, DEFAULT_RECORDER_CONFIG, START_STT_SERVER
    import copy
    
    # Create a temporary TranscriptionProcessor just to initialize the recorder
    temp_config = copy.deepcopy(DEFAULT_RECORDER_CONFIG)
    temp_config['language'] = LANGUAGE
    
    # We'll create the recorder directly without callbacks for now
    # Callbacks will be set per-connection
    if START_STT_SERVER:
        from RealtimeSTT import AudioToTextRecorderClient
        shared_recorder = AudioToTextRecorderClient(**temp_config)
    else:
        from RealtimeSTT import AudioToTextRecorder
        # Remove callback keys from config for initial creation
        init_config = {k: v for k, v in temp_config.items() 
                      if k not in ['on_realtime_transcription_update', 'on_turn_detection_start', 
                                   'on_turn_detection_stop', 'on_recording_start', 'on_recording_stop']}
        shared_recorder = AudioToTextRecorder(**init_config)
        shared_recorder.use_wake_words = False
    
    app.state.shared_recorder = shared_recorder
    logger.info("🖥️✅ Shared STT recorder initialized (Whisper model loaded)")
    
    # 4. Shared utility classes (lightweight but why not)
    from text_similarity import TextSimilarity
    from text_context import TextContext
    app.state.shared_text_similarity = TextSimilarity(focus='end', n_words=5)
    app.state.shared_text_context = TextContext()
    logger.info("🖥️✅ Shared utility classes initialized")
    
    logger.info("🖥️✅ All shared resources initialized - ready for connections")

    yield

    logger.info("🖥️⏹️ Server shutting down")
    
    # Cleanup shared resources
    if hasattr(app.state, 'shared_recorder') and app.state.shared_recorder:
        try:
            logger.info("🖥️🧹 Shutting down shared recorder...")
            app.state.shared_recorder.shutdown()
        except Exception as e:
            logger.error(f"🖥️⚠️ Error shutting down shared recorder: {e}")
    
    logger.info("🖥️👋 Server shutdown complete")

# --------------------------------------------------------------------
# FastAPI app instance
# --------------------------------------------------------------------
app = FastAPI(lifespan=lifespan)

# Enable CORS if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files with no cache
app.mount("/static", NoCacheStaticFiles(directory="static"), name="static")

@app.get("/favicon.ico")
async def favicon():
    """
    Serves the favicon.ico file.

    Returns:
        A FileResponse containing the favicon.
    """
    return FileResponse("static/favicon.ico")

@app.get("/app.js")
async def app_js():
    """
    Serves the app.js file.

    Returns:
        A FileResponse containing the app.js
    """
    return FileResponse("static/app.js")

@app.get("/app.css")
async def app_css():
    """
    Serves the app.css file.

    Returns:
        A FileResponse containing the app.css
    """
    return FileResponse("static/app.css")

@app.get("/")
async def get_index() -> HTMLResponse:
    """
    Serves the main index.html page.

    Reads the content of static/index.html and returns it as an HTML response.

    Returns:
        An HTMLResponse containing the content of index.html.
    """
    with open("static/index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

# --------------------------------------------------------------------
# Utility functions
# --------------------------------------------------------------------
def parse_json_message(text: str) -> dict:
    """
    Safely parses a JSON string into a dictionary.

    Logs a warning if the JSON is invalid and returns an empty dictionary.

    Args:
        text: The JSON string to parse.

    Returns:
        A dictionary representing the parsed JSON, or an empty dictionary on error.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("🖥️⚠️ Ignoring client message with invalid JSON")
        return {}

def format_timestamp_ns(timestamp_ns: int) -> str:
    """
    Formats a nanosecond timestamp into a human-readable HH:MM:SS.fff string.

    Args:
        timestamp_ns: The timestamp in nanoseconds since the epoch.

    Returns:
        A string formatted as hours:minutes:seconds.milliseconds.
    """
    # Split into whole seconds and the nanosecond remainder
    seconds = timestamp_ns // 1_000_000_000
    remainder_ns = timestamp_ns % 1_000_000_000

    # Convert seconds part into a datetime object (local time)
    dt = datetime.fromtimestamp(seconds)

    # Format the main time as HH:MM:SS
    time_str = dt.strftime("%H:%M:%S")

    # For instance, if you want milliseconds, divide the remainder by 1e6 and format as 3-digit
    milliseconds = remainder_ns // 1_000_000
    formatted_timestamp = f"{time_str}.{milliseconds:03d}"

    return formatted_timestamp

# --------------------------------------------------------------------
# WebSocket data processing
# --------------------------------------------------------------------

async def process_incoming_data(ws: WebSocket, conn_state, incoming_chunks: asyncio.Queue, callbacks: 'TranscriptionCallbacks') -> None:
    """
    Receives messages via WebSocket, processes audio and text messages.

    Handles binary audio chunks, extracting metadata (timestamp, flags) and
    putting the audio PCM data with metadata into the `incoming_chunks` queue.
    Applies back-pressure if the queue is full.
    Parses text messages (assumed JSON) and triggers actions based on message type
    (e.g., updates client TTS state via `callbacks`, clears history, sets speed).

    Args:
        ws: The WebSocket connection instance.
        app: The FastAPI application instance (for accessing global state if needed).
        incoming_chunks: An asyncio queue to put processed audio metadata dictionaries into.
        callbacks: The TranscriptionCallbacks instance for this connection to manage state.
    """
    try:
        while True:
            msg = await ws.receive()
            if "bytes" in msg and msg["bytes"]:
                raw = msg["bytes"]

                # Ensure we have at least an 8‑byte header: 4 bytes timestamp_ms + 4 bytes flags
                if len(raw) < 8:
                    logger.warning("🖥️⚠️ Received packet too short for 8‑byte header.")
                    continue

                # Unpack big‑endian uint32 timestamp (ms) and uint32 flags
                timestamp_ms, flags = struct.unpack("!II", raw[:8])
                client_sent_ns = timestamp_ms * 1_000_000

                # Build metadata using fixed fields
                metadata = {
                    "client_sent_ms":           timestamp_ms,
                    "client_sent":              client_sent_ns,
                    "client_sent_formatted":    format_timestamp_ns(client_sent_ns),
                    "isTTSPlaying":             bool(flags & 1),
                }

                # Record server receive time
                server_ns = time.time_ns()
                metadata["server_received"] = server_ns
                metadata["server_received_formatted"] = format_timestamp_ns(server_ns)

                # The rest of the payload is raw PCM bytes
                metadata["pcm"] = raw[8:]

                # Check queue size before putting data
                current_qsize = incoming_chunks.qsize()
                if current_qsize < MAX_AUDIO_QUEUE_SIZE:
                    # Now put only the metadata dict (containing PCM audio) into the processing queue.
                    await incoming_chunks.put(metadata)
                else:
                    # Queue is full, drop the chunk and log a warning
                    logger.warning(
                        f"🖥️⚠️ Audio queue full ({current_qsize}/{MAX_AUDIO_QUEUE_SIZE}); dropping chunk. Possible lag."
                    )

            elif "text" in msg and msg["text"]:
                # Text-based message: parse JSON
                data = parse_json_message(msg["text"])
                msg_type = data.get("type")
                logger.info(Colors.apply(f"🖥️📥 ←←Client: {data}").orange)


                if msg_type == "tts_start":
                    logger.info("🖥️ℹ️ Received tts_start from client.")
                    # Update connection-specific state via callbacks
                    callbacks.tts_client_playing = True
                elif msg_type == "tts_stop":
                    logger.info("🖥️ℹ️ Received tts_stop from client.")
                    # Update connection-specific state via callbacks
                    callbacks.tts_client_playing = False
                # Add to the handleJSONMessage function in server.py
                elif msg_type == "clear_history":
                    logger.info("🖥️ℹ️ Received clear_history from client.")
                    conn_state.pipeline_manager.reset()
                elif msg_type == "set_speed":
                    speed_value = data.get("speed", 0)
                    speed_factor = speed_value / 100.0  # Convert 0-100 to 0.0-1.0
                    turn_detection = conn_state.audio_processor.transcriber.turn_detection
                    if turn_detection:
                        turn_detection.update_settings(speed_factor)
                        logger.info(f"🖥️⚙️ Updated turn detection settings to factor: {speed_factor:.2f}")


    except asyncio.CancelledError:
        pass # Task cancellation is expected on disconnect
    except WebSocketDisconnect as e:
        logger.warning(f"🖥️⚠️ {Colors.apply('WARNING').red} disconnect in process_incoming_data: {repr(e)}")
    except RuntimeError as e:  # Often raised on closed transports
        logger.error(f"🖥️💥 {Colors.apply('RUNTIME_ERROR').red} in process_incoming_data: {repr(e)}")
    except Exception as e:
        logger.exception(f"🖥️💥 {Colors.apply('EXCEPTION').red} in process_incoming_data: {repr(e)}")

async def send_text_messages(ws: WebSocket, message_queue: asyncio.Queue) -> None:
    """
    Continuously sends text messages from a queue to the client via WebSocket.

    Waits for messages on the `message_queue`, formats them as JSON, and sends
    them to the connected WebSocket client. Logs non-TTS messages.

    Args:
        ws: The WebSocket connection instance.
        message_queue: An asyncio queue yielding dictionaries to be sent as JSON.
    """
    try:
        while True:
            await asyncio.sleep(0.001) # Yield control
            data = await message_queue.get()
            msg_type = data.get("type")
            if msg_type != "tts_chunk":
                logger.info(Colors.apply(f"🖥️📤 →→Client: {data}").orange)
            else:
                logger.debug("🖥️📤 sent tts_chunk")
            await ws.send_json(data)
    except asyncio.CancelledError:
        pass # Task cancellation is expected on disconnect
    except WebSocketDisconnect as e:
        logger.warning(f"🖥️⚠️ {Colors.apply('WARNING').red} disconnect in send_text_messages: {repr(e)}")
    except RuntimeError as e:  # Often raised on closed transports
        logger.error(f"🖥️💥 {Colors.apply('RUNTIME_ERROR').red} in send_text_messages: {repr(e)}")
    except Exception as e:
        logger.exception(f"🖥️💥 {Colors.apply('EXCEPTION').red} in send_text_messages: {repr(e)}")

async def _reset_interrupt_flag_async(audio_processor, callbacks: 'TranscriptionCallbacks'):
    """
    Resets the microphone interruption flag after a delay (async version).

    Waits for 1 second, then checks if the AudioInputProcessor is still marked
    as interrupted. If so, resets the flag on both the processor and the
    connection-specific callbacks instance.

    Args:
        audio_processor: The connection-specific AudioInputProcessor instance.
        callbacks: The TranscriptionCallbacks instance for the connection.
    """
    await asyncio.sleep(1)
    # Check the AudioInputProcessor's own interrupted state
    if audio_processor.interrupted:
        logger.info(f"{Colors.apply('🖥️🎙️ ▶️ Microphone continued (async reset)').cyan}")
        audio_processor.interrupted = False
        # Reset connection-specific interruption time via callbacks
        callbacks.interruption_time = 0
        logger.info(Colors.apply("🖥️🎙️ interruption flag reset after TTS chunk (async)").cyan)

async def send_tts_chunks(conn_state, message_queue: asyncio.Queue, callbacks: 'TranscriptionCallbacks') -> None:
    """
    Continuously sends TTS audio chunks from the SpeechPipelineManager to the client.

    Monitors the state of the current speech generation (if any) and the client
    connection (via `callbacks`). Retrieves audio chunks from the active generation's
    queue, upsamples/encodes them, and puts them onto the outgoing `message_queue`
    for the client. Handles the end-of-generation logic and state resets.

    Args:
        app: The FastAPI application instance (to access global components).
        message_queue: An asyncio queue to put outgoing TTS chunk messages onto.
        callbacks: The TranscriptionCallbacks instance managing this connection's state.
    """
    try:
        logger.info("🖥️🔊 Starting TTS chunk sender")
        last_quick_answer_chunk = 0
        last_chunk_sent = 0
        prev_status = None

        while True:
            # Use connection-specific interruption_time via callbacks
            if conn_state.audio_processor.interrupted and callbacks.interruption_time and time.time() - callbacks.interruption_time > 2.0:
                conn_state.audio_processor.interrupted = False
                callbacks.interruption_time = 0 # Reset via callbacks
                logger.info(Colors.apply("🖥️🎙️ interruption flag reset after 2 seconds").cyan)

            is_tts_finished = conn_state.pipeline_manager.is_valid_gen() and conn_state.pipeline_manager.running_generation.audio_quick_finished

            def log_status():
                nonlocal prev_status
                last_quick_answer_chunk_decayed = (
                    last_quick_answer_chunk
                    and time.time() - last_quick_answer_chunk > TTS_FINAL_TIMEOUT
                    and time.time() - last_chunk_sent > TTS_FINAL_TIMEOUT
                )

                curr_status = (
                    # Access connection-specific state via callbacks
                    int(callbacks.tts_to_client),
                    int(callbacks.tts_client_playing),
                    int(callbacks.tts_chunk_sent),
                    1, # Placeholder?
                    int(callbacks.is_hot), # from callbacks
                    int(callbacks.synthesis_started), # from callbacks
                    int(conn_state.pipeline_manager.running_generation is not None), # Connection-specific manager state
                    int(conn_state.pipeline_manager.is_valid_gen()), # Connection-specific manager state
                    int(is_tts_finished), # Calculated local variable
                    int(conn_state.audio_processor.interrupted) # Connection-specific processor state
                )

                if curr_status != prev_status:
                    status = Colors.apply("🖥️🚦 State ").red
                    logger.info(
                        f"{status} ToClient {curr_status[0]}, "
                        f"ttsClientON {curr_status[1]}, " # Renamed slightly for clarity
                        f"ChunkSent {curr_status[2]}, "
                        f"hot {curr_status[4]}, synth {curr_status[5]}"
                        f" gen {curr_status[6]}"
                        f" valid {curr_status[7]}"
                        f" tts_q_fin {curr_status[8]}"
                        f" mic_inter {curr_status[9]}"
                    )
                    prev_status = curr_status

            # Use connection-specific state via callbacks
            if not callbacks.tts_to_client:
                log_status()
                await asyncio.sleep(0.001)  # Only sleep when waiting
                continue

            if not conn_state.pipeline_manager.running_generation:
                log_status()
                await asyncio.sleep(0.001)  # Only sleep when waiting
                continue

            if conn_state.pipeline_manager.running_generation.abortion_started:
                log_status()
                await asyncio.sleep(0.001)  # Only sleep when waiting
                continue

            if not conn_state.pipeline_manager.running_generation.audio_quick_finished:
                conn_state.pipeline_manager.running_generation.tts_quick_allowed_event.set()

            if not conn_state.pipeline_manager.running_generation.quick_answer_first_chunk_ready:
                log_status()
                await asyncio.sleep(0.001)  # Only sleep when waiting
                continue

            chunk = None
            try:
                chunk = conn_state.pipeline_manager.running_generation.audio_chunks.get_nowait()
                if chunk:
                    last_quick_answer_chunk = time.time()
                    # TTS chunk received - no need to log every chunk
            except Empty:
                final_expected = conn_state.pipeline_manager.running_generation.quick_answer_provided
                audio_final_finished = conn_state.pipeline_manager.running_generation.audio_final_finished
                llm_finished = conn_state.pipeline_manager.running_generation.llm_finished

                # Only send final answer when BOTH audio AND LLM are finished
                if (not final_expected or audio_final_finished) and llm_finished:
                    # Small delay to ensure on_partial_assistant_text callback has been called
                    await asyncio.sleep(0.1)
                    callbacks.send_final_assistant_answer() # Callbacks method

                    assistant_answer = conn_state.pipeline_manager.running_generation.quick_answer + conn_state.pipeline_manager.running_generation.final_answer                    
                    conn_state.pipeline_manager.running_generation = None

                    callbacks.tts_chunk_sent = False # Reset via callbacks
                    callbacks.reset_state() # Reset connection state via callbacks

                log_status()
                await asyncio.sleep(0.001)  # Only sleep when waiting
                continue

            # Process chunk immediately without sleeping
            base64_chunk = conn_state.upsampler.get_base64_chunk(chunk)
            logger.debug(f"🖥️🔊 sending tts_chunk b64_len={len(base64_chunk)}")
            message_queue.put_nowait({
                "type": "tts_chunk",
                "content": base64_chunk
            })
            last_chunk_sent = time.time()

            # Use connection-specific state via callbacks
            if not callbacks.tts_chunk_sent:
                # Use the async helper function instead of a thread
                asyncio.create_task(_reset_interrupt_flag_async(conn_state.audio_processor, callbacks))

            callbacks.tts_chunk_sent = True # Set via callbacks

    except asyncio.CancelledError:
        pass # Task cancellation is expected on disconnect
    except WebSocketDisconnect as e:
        logger.warning(f"🖥️⚠️ {Colors.apply('WARNING').red} disconnect in send_tts_chunks: {repr(e)}")
    except RuntimeError as e:
        logger.error(f"🖥️💥 {Colors.apply('RUNTIME_ERROR').red} in send_tts_chunks: {repr(e)}")
    except Exception as e:
        logger.exception(f"🖥️💥 {Colors.apply('EXCEPTION').red} in send_tts_chunks: {repr(e)}")


# --------------------------------------------------------------------
# Callback class to handle transcription events
# --------------------------------------------------------------------
class TranscriptionCallbacks:
    """
    Manages state and callbacks for a single WebSocket connection's transcription lifecycle.

    This class holds connection-specific state flags (like TTS status, user interruption)
    and implements callback methods triggered by the `AudioInputProcessor` and
    `SpeechPipelineManager`. It sends messages back to the client via the provided
    `message_queue` and manages interaction logic like interruptions and final answer delivery.
    It also includes a threaded worker to handle abort checks based on partial transcription.
    """
    def __init__(self, conn_state, message_queue: asyncio.Queue, user_id: str):
        """
        Initializes the TranscriptionCallbacks instance for a WebSocket connection.

        Args:
            conn_state: The connection-specific state object containing pipeline_manager and audio_processor.
            message_queue: An asyncio queue for sending messages back to the client.
            user_id: Short identifier for this user (for logging).
        """
        self.conn_state = conn_state
        self.message_queue = message_queue
        self.user_id = user_id
        self.final_transcription = ""
        self.last_user_speech_time = 0  # Track when user last spoke
        self.user_speech_received = False  # Track if user spoke
        self.abort_text = ""
        self.last_abort_text = ""

        # Initialize connection-specific state flags here
        self.tts_to_client: bool = False
        self.user_interrupted: bool = False
        self.tts_chunk_sent: bool = False
        self.tts_client_playing: bool = False
        self.interruption_time: float = 0.0

        # These were already effectively instance variables or reset logic existed
        self.silence_active: bool = True
        self.is_hot: bool = False
        self.user_finished_turn: bool = False
        self.synthesis_started: bool = False
        self.assistant_answer: str = ""
        self.final_assistant_answer: str = ""
        self.is_processing_potential: bool = False
        self.is_processing_final: bool = False
        self.last_inferred_transcription: str = ""
        self.final_assistant_answer_sent: bool = False
        self.partial_transcription: str = "" # Added for clarity

        # NEW: Sentence-by-sentence tracking for separate bubbles
        self.sent_sentences: list = []  # Track sentences already sent to client
        self.sentence_counter: int = 0  # Counter for unique sentence IDs

        self.reset_state() # Call reset to ensure consistency

        self.abort_request_event = threading.Event()
        self.abort_worker_thread = threading.Thread(target=self._abort_worker, name="AbortWorker", daemon=True)
        self.abort_worker_thread.start()


    def reset_state(self):
        """Resets connection-specific state flags and variables to their initial values."""
        # Reset all connection-specific state flags
        self.tts_to_client = False
        self.user_interrupted = False
        self.tts_chunk_sent = False
        # Don't reset tts_client_playing here, it reflects client state reports
        self.interruption_time = 0.0

        # Reset other state variables
        self.silence_active = True
        self.is_hot = False
        self.user_finished_turn = False
        self.synthesis_started = False
        self.assistant_answer = ""
        self.final_assistant_answer = ""
        self.is_processing_potential = False
        self.is_processing_final = False
        self.last_inferred_transcription = ""
        self.final_assistant_answer_sent = False
        self.partial_transcription = ""

        # Reset sentence tracking
        self.sent_sentences.clear()
        self.sentence_counter = 0

        # Keep the abort call related to the audio processor/pipeline manager
        self.conn_state.audio_processor.abort_generation()


    def send_sentence_if_complete(self, text: str) -> None:
        """
        Detects complete sentences and sends them as individual message bubbles.
        Each sentence appears as TTS starts speaking it.
        
        Args:
            text: The current accumulated text from LLM
        """
        import re
        
        # Split by sentence endings, keeping the punctuation
        # This regex splits on . ! ? but keeps the punctuation with the sentence
        parts = re.split(r'([.!?。]+)', text)
        
        # Reconstruct complete sentences with their punctuation
        complete_sentences = []
        for i in range(0, len(parts) - 1, 2):
            if i + 1 < len(parts):
                sentence = (parts[i] + parts[i + 1]).strip()
                # Only consider it a sentence if it has minimum length and content
                if len(sentence) > 10 and any(c.isalnum() for c in sentence):
                    complete_sentences.append(sentence)
        
        # Send any new sentences that haven't been sent yet
        for sentence in complete_sentences:
            # Check if this exact sentence was already sent (avoid duplicates)
            if sentence not in self.sent_sentences:
                # This is a new sentence - send it as a separate bubble
                self.sentence_counter += 1
                # Sentence sent - no need to log, already logged in on_partial_assistant_text
                self.message_queue.put_nowait({
                    "type": "assistant_sentence",
                    "content": sentence,
                    "sentence_id": self.sentence_counter,
                })
                
                self.sent_sentences.append(sentence)
            else:
                logger.debug(f"🖥️💬 Skipping duplicate sentence: {sentence[:60]}...")

    def _abort_worker(self):
        """Background thread worker to check for abort conditions based on partial text."""
        while True:
            was_set = self.abort_request_event.wait(timeout=0.1) # Check every 100ms
            if was_set:
                self.abort_request_event.clear()
                # Only trigger abort check if the text actually changed
                if self.last_abort_text != self.abort_text:
                    self.last_abort_text = self.abort_text
                    logger.debug(f"🖥️🧠 Abort check triggered by partial: '{self.abort_text}'")
                    # Use connection-specific pipeline manager
                    self.conn_state.pipeline_manager.check_abort(self.abort_text, False, "on_partial")

    def on_partial(self, txt: str):
        """
        Callback invoked when a partial transcription result is available.

        Updates internal state, sends the partial result to the client,
        and signals the abort worker thread to check for potential interruptions.

        Args:
            txt: The partial transcription text.
        """
        self.final_assistant_answer_sent = False # New user speech invalidates previous final answer sending state
        self.final_transcription = "" # Clear final transcription as this is partial
        self.partial_transcription = txt
        self.message_queue.put_nowait({"type": "partial_user_request", "content": txt})
        self.abort_text = txt # Update text used for abort check
        self.abort_request_event.set() # Signal the abort worker

    def safe_abort_running_syntheses(self, reason: str):
        """Placeholder for safely aborting syntheses (currently does nothing)."""
        # TODO: Implement actual abort logic if needed, potentially interacting with SpeechPipelineManager
        pass

    def on_tts_allowed_to_synthesize(self):
        """Callback invoked when the system determines TTS synthesis can proceed."""
        # Access connection-specific manager state
        if self.conn_state.pipeline_manager.running_generation and not self.conn_state.pipeline_manager.running_generation.abortion_started:
            self.conn_state.pipeline_manager.running_generation.tts_quick_allowed_event.set()

    def on_potential_sentence(self, txt: str):
        """
        Callback invoked when a potentially complete sentence is detected by the STT.

        Triggers the preparation of a speech generation based on this potential sentence.

        Args:
            txt: The potential sentence text.
        """
        logger.debug(f"🖥️🧠 Potential sentence: '{txt}'")
        # Access connection-specific manager state
        self.conn_state.pipeline_manager.prepare_generation(txt)

    def on_potential_final(self, txt: str):
        """
        Callback invoked when a potential *final* transcription is detected (hot state).

        Logs the potential final transcription.

        Args:
            txt: The potential final transcription text.
        """
        logger.info(f"{Colors.apply('🖥️🧠 HOT: ').magenta}{txt}")

    def on_potential_abort(self):
        """Callback invoked if the STT detects a potential need to abort based on user speech."""
        # Placeholder: Currently logs nothing, could trigger abort logic.
        pass

    def on_before_final(self, audio: bytes, txt: str):
        """
        Callback invoked just before the final STT result for a user turn is confirmed.

        Sets flags indicating user finished, allows TTS if pending, interrupts microphone input,
        releases TTS stream to client, sends final user request and any pending partial
        assistant answer to the client, and adds user request to history.

        Args:
            audio: The raw audio bytes corresponding to the final transcription. (Currently unused)
            txt: The transcription text (might be slightly refined in on_final).
        """
        logger.info(Colors.apply('🖥️🏁 =================== USER TURN END ===================').light_gray)
        self.user_finished_turn = True
        self.user_interrupted = False # Reset connection-specific flag (user finished, not interrupted)
        # Access connection-specific manager state
        if self.conn_state.pipeline_manager.is_valid_gen():
            logger.info(f"{Colors.apply('🖥️🔊 TTS ALLOWED (before final)').blue}")
            self.conn_state.pipeline_manager.running_generation.tts_quick_allowed_event.set()

        # first block further incoming audio (Audio processor's state)
        if not self.conn_state.audio_processor.interrupted:
            logger.info(f"{Colors.apply('🖥️🎙️ ⏸️ Microphone interrupted (end of turn)').cyan}")
            self.conn_state.audio_processor.interrupted = True
            self.interruption_time = time.time() # Set connection-specific flag

        logger.info(f"{Colors.apply('🖥️🔊 TTS STREAM RELEASED').blue}")
        self.tts_to_client = True # Set connection-specific flag

        # Send final user request (using the reliable final_transcription OR current partial if final isn't set yet)
        user_request_content = self.final_transcription if self.final_transcription else self.partial_transcription
        self.message_queue.put_nowait({
            "type": "final_user_request",
            "content": user_request_content
        })

        # Access connection-specific manager state
        if self.conn_state.pipeline_manager.is_valid_gen():
            # Send partial assistant answer (if available) to the client
            # Use connection-specific user_interrupted flag
            if self.conn_state.pipeline_manager.running_generation.quick_answer and not self.user_interrupted:
                self.assistant_answer = self.conn_state.pipeline_manager.running_generation.quick_answer
                self.message_queue.put_nowait({
                    "type": "partial_assistant_answer",
                    "content": self.assistant_answer
                })

        logger.info(f"🖥️🧠 Adding user request to history: '{user_request_content}'")
        # Use connection-specific conversation history
        self.conn_state.conversation_history.append({"role": "user", "content": user_request_content})
        # Also update the shared pipeline manager's history for this request
        self.conn_state.pipeline_manager.history = self.conn_state.conversation_history

    def on_final(self, txt: str):
        """
        Callback invoked when the final transcription result for a user turn is available.

        Logs the final transcription and stores it.

        Args:
            txt: The final transcription text.
        """
        log_event("👤", f"[User {self.user_id}] Said: \"{txt}\"")
        self.last_user_speech_time = time.time()  # Track when user spoke
        self.user_speech_received = True  # Flag that user spoke
        
        if not self.final_transcription: # Store it if not already set by on_before_final logic
             self.final_transcription = txt

    def abort_generations(self, reason: str):
        """
        Triggers the abortion of any ongoing speech generation process.

        Logs the reason and calls the SpeechPipelineManager's abort method.

        Args:
            reason: A string describing why the abortion is triggered.
        """
        logger.info(f"{Colors.apply('🖥️🛑 Aborting generation:').blue} {reason}")
        # Access connection-specific manager state
        self.conn_state.pipeline_manager.abort_generation(reason=f"server.py abort_generations: {reason}")

    def on_silence_active(self, silence_active: bool):
        """
        Callback invoked when the silence detection state changes.

        Updates the internal silence_active flag.

        Args:
            silence_active: True if silence is currently detected, False otherwise.
        """
        # logger.debug(f"🖥️🎙️ Silence active: {silence_active}") # Optional: Can be noisy
        self.silence_active = silence_active

    def on_partial_assistant_text(self, txt: str):
        """
        Callback invoked when a partial text result from the assistant (LLM) is available.

        Updates the internal assistant answer state and sends complete sentences as 
        individual message bubbles to the client, unless the user has interrupted.

        Args:
            txt: The partial assistant text.
        """
        # Only log when text changes significantly (not every token)
        if not hasattr(self, '_last_logged_length') or len(txt) - self._last_logged_length > 50:
            log_event("🤖", f"[User {self.user_id}] Assistant: {txt[:80]}{'...' if len(txt) > 80 else ''}")
            self._last_logged_length = len(txt)
            
            # Check if this is the first response after user speech
            if hasattr(self, 'user_speech_received') and self.user_speech_received and len(txt) > 20:
                response_time = time.time() - self.last_user_speech_time
                log_event("⏱️", f"[User {self.user_id}] Response started ({response_time:.1f}s after user spoke)")
                self.user_speech_received = False  # Reset flag
        
        # Use connection-specific user_interrupted flag
        if not self.user_interrupted:
            self.assistant_answer = txt
            # Use connection-specific tts_to_client flag
            if self.tts_to_client:
                # Send complete sentences as individual bubbles
                self.send_sentence_if_complete(txt)

    def on_recording_start(self):
        """
        Callback invoked when the audio input processor starts recording user speech.

        If client-side TTS is playing, it triggers an interruption: stops server-side
        TTS streaming, sends stop/interruption messages to the client, aborts ongoing
        generation, sends any final assistant answer generated so far, and resets relevant state.
        """
        log_event("🎤", f"[User {self.user_id}] Started speaking")
        # Use connection-specific tts_client_playing flag
        if self.tts_client_playing:
            self.tts_to_client = False # Stop server sending TTS
            self.user_interrupted = True # Mark connection as user interrupted
            logger.info(f"{Colors.apply('🖥️❗ INTERRUPTING TTS due to recording start').blue}")

            # Send final assistant answer *if* one was generated and not sent
            logger.info(Colors.apply("🖥️✅ Sending final assistant answer (forced on interruption)").pink)
            self.send_final_assistant_answer(forced=True)

            # Minimal reset for interruption:
            self.tts_chunk_sent = False # Reset chunk sending flag
            # self.assistant_answer = "" # Optional: Clear partial answer if needed

            logger.info("🖥️🛑 Sending stop_tts to client.")
            self.message_queue.put_nowait({
                "type": "stop_tts", # Client handles this to mute/ignore
                "content": ""
            })

            logger.info(f"{Colors.apply('🖥️🛑 RECORDING START ABORTING GENERATION').red}")
            self.abort_generations("on_recording_start, user interrupts, TTS Playing")

            logger.info("🖥️❗ Sending tts_interruption to client.")
            self.message_queue.put_nowait({ # Tell client to stop playback and clear buffer
                "type": "tts_interruption",
                "content": ""
            })

            # Reset state *after* performing actions based on the old state
            # Be careful what exactly needs reset vs persists (like tts_client_playing)
            # self.reset_state() # Might clear too much, like user_interrupted prematurely

    def send_final_assistant_answer(self, forced=False):
        """
        Sends the final (or best available) assistant answer to the client.

        Uses the complete text from self.assistant_answer which is updated by
        on_partial_assistant_text callback with the full LLM response.
        Falls back to pipeline manager's quick_answer + final_answer if needed.

        Args:
            forced: If True, attempts to send the last partial answer if no complete
                    final answer is available. Defaults to False.
        """
        final_answer = ""
        
        # FIRST: Try to use self.assistant_answer which has the complete text
        if self.assistant_answer:
            final_answer = self.assistant_answer
            logger.debug(f"🖥️✅ Using complete assistant_answer: '{final_answer[:100]}...'")
        # FALLBACK: Use pipeline manager's quick_answer + final_answer
        elif self.conn_state.pipeline_manager.is_valid_gen():
            final_answer = self.conn_state.pipeline_manager.running_generation.quick_answer + self.conn_state.pipeline_manager.running_generation.final_answer
            logger.debug(f"🖥️✅ Using pipeline quick+final answer: '{final_answer[:100]}...'")

        if not final_answer: # Check if constructed answer is empty
            logger.warning(f"🖥️⚠️ Final assistant answer was empty, not sending.")
            return # Nothing to send

        logger.debug(f"🖥️✅ Attempting to send final answer: '{final_answer}' (Sent previously: {self.final_assistant_answer_sent})")

        if not self.final_assistant_answer_sent and final_answer:
            import re
            # Clean up the final answer text
            cleaned_answer = re.sub(r'[\r\n]+', ' ', final_answer)
            cleaned_answer = re.sub(r'\s+', ' ', cleaned_answer).strip()
            cleaned_answer = cleaned_answer.replace('\\n', ' ')
            cleaned_answer = re.sub(r'\s+', ' ', cleaned_answer).strip()

            if cleaned_answer: # Ensure it's not empty after cleaning
                # Check if response took too long (potential issue)
                if hasattr(self, 'last_user_speech_time') and self.last_user_speech_time > 0:
                    response_time = time.time() - self.last_user_speech_time
                    if response_time > 10:
                        log_event("⚠️", f"[User {self.user_id}] Slow response ({response_time:.1f}s)", "warning")
                
                log_event("✅", f"[User {self.user_id}] Complete: \"{cleaned_answer[:100]}{'...' if len(cleaned_answer) > 100 else ''}\"")
                self.user_speech_received = False  # Reset flag after response
                self.message_queue.put_nowait({
                    "type": "final_assistant_answer",
                    "content": cleaned_answer
                })
                # Use connection-specific conversation history
                self.conn_state.conversation_history.append({"role": "assistant", "content": cleaned_answer})
                # Also update the shared pipeline manager's history
                self.conn_state.pipeline_manager.history = self.conn_state.conversation_history
                self.final_assistant_answer_sent = True
                self.final_assistant_answer = cleaned_answer # Store the sent answer
            else:
                logger.warning(f"🖥️⚠️ {Colors.YELLOW}Final assistant answer was empty after cleaning.{Colors.RESET}")
                self.final_assistant_answer_sent = False # Don't mark as sent
                self.final_assistant_answer = "" # Clear the stored answer
        elif forced and not final_answer: # Should not happen due to earlier check, but safety
             logger.warning(f"🖥️⚠️ {Colors.YELLOW}Forced send of final assistant answer, but it was empty.{Colors.RESET}")
             self.final_assistant_answer = "" # Clear the stored answer


# --------------------------------------------------------------------
# Main WebSocket endpoint
# --------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    Handles the main WebSocket connection for real-time voice chat.
    
    Creates isolated SpeechPipelineManager and AudioInputProcessor per connection
    to ensure each user has their own conversation context and doesn't interfere
    with other users.

    Args:
        ws: The WebSocket connection instance provided by FastAPI.
    """
    await ws.accept()
    connection_id = id(ws)  # Unique ID for this connection
    # Create a short, readable user ID (last 4 digits)
    user_id = str(connection_id)[-4:]
    log_event("🔌", f"[User {user_id}] Connected")

    message_queue = asyncio.Queue()
    audio_chunks = asyncio.Queue()
    
    # Send "initializing" status to client
    await ws.send_json({
        "type": "status",
        "status": "initializing",
        "message": "Setting up your interview session..."
    })
    
    # Create DEDICATED pipeline manager for this connection
    # Uses SHARED resources (TTS engine, LLM client, STT recorder) but maintains
    # per-connection state (history, generation state, callbacks)
    log_event("⚙️", f"[User {user_id}] Initializing session (using shared models)...")
    
    # Prepare shared audio processor wrapper
    from audio_module import AudioProcessor
    shared_audio_wrapper = AudioProcessor(
        engine=TTS_START_ENGINE,
        orpheus_model=TTS_ORPHEUS_MODEL,
        skip_prewarm=True,  # Skip prewarm, use shared resources
        shared_engine=app.state.shared_tts_engine,
        shared_stream=app.state.shared_tts_stream,
    )
    
    # Create pipeline manager with shared resources
    pipeline_config = app.state.PIPELINE_CONFIG.copy()
    pipeline_config.update({
        "skip_prewarm": True,  # Skip prewarming, use shared resources
        "shared_audio_processor": shared_audio_wrapper,
        "shared_llm": app.state.shared_llm,
        "shared_text_similarity": app.state.shared_text_similarity,
        "shared_text_context": app.state.shared_text_context,
    })
    
    pipeline_manager = SpeechPipelineManager(**pipeline_config)
    log_event("✅", f"[User {user_id}] Pipeline ready (shared models)")
    
    # Create DEDICATED audio processor for this connection (uses shared recorder)
    audio_processor = AudioInputProcessor(
        LANGUAGE,
        is_orpheus=TTS_START_ENGINE=="orpheus",
        pipeline_latency=pipeline_manager.full_output_pipeline_latency / 1000,
        shared_recorder=app.state.shared_recorder,  # Use shared recorder
    )
    log_event("🎧", f"[User {user_id}] Audio system ready (shared recorder)")

    # Create connection state holder
    class ConnectionState:
        def __init__(self):
            self.pipeline_manager = pipeline_manager
            self.audio_processor = audio_processor
            self.upsampler = app.state.Upsampler  # Shared (stateless)
            self.conversation_history = []  # Per-connection history
    
    conn_state = ConnectionState()

    # Set up callback manager with connection-specific state
    callbacks = TranscriptionCallbacks(conn_state, message_queue, user_id)

    # Assign callbacks to the shared AudioInputProcessor
    audio_processor.realtime_callback = callbacks.on_partial
    audio_processor.transcriber.potential_sentence_end = callbacks.on_potential_sentence
    audio_processor.transcriber.on_tts_allowed_to_synthesize = callbacks.on_tts_allowed_to_synthesize
    audio_processor.transcriber.potential_full_transcription_callback = callbacks.on_potential_final
    audio_processor.transcriber.potential_full_transcription_abort_callback = callbacks.on_potential_abort
    audio_processor.transcriber.full_transcription_callback = callbacks.on_final
    audio_processor.transcriber.before_final_sentence = callbacks.on_before_final
    audio_processor.recording_start_callback = callbacks.on_recording_start
    audio_processor.silence_active_callback = callbacks.on_silence_active

    # Assign callback to the shared SpeechPipelineManager
    pipeline_manager.on_partial_assistant_text = callbacks.on_partial_assistant_text

    # Create tasks for handling different responsibilities
    tasks = [
        asyncio.create_task(process_incoming_data(ws, conn_state, audio_chunks, callbacks)),
        asyncio.create_task(audio_processor.process_chunk_queue(audio_chunks)),
        asyncio.create_task(send_text_messages(ws, message_queue)),
        asyncio.create_task(send_tts_chunks(conn_state, message_queue, callbacks)),
    ]
    
    # NOW send "ready" status - everything is initialized and tasks are running
    await ws.send_json({
        "type": "status",
        "status": "ready",
        "message": "Interview session ready! You can start speaking now."
    })
    log_event("🚀", f"[User {user_id}] Interview session ready - user can speak now")

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
        log_event("👋", f"[User {user_id}] Disconnected")
        
        # Clear this connection's history
        conn_state.conversation_history = []
        
        # Cancel all tasks
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Clean up connection-specific resources
        try:
            # Abort any ongoing generation
            if pipeline_manager.running_generation:
                pipeline_manager.abort_generation(reason="Connection closed")
            
            # Clear pipeline resources
            pipeline_manager.history = []
            
            # Stop audio processor
            audio_processor.interrupted = True
            
            logger.info(f"🖥️✅ Cleaned up pipeline and audio processor for connection {connection_id}")
        except Exception as e:
            logger.error(f"🖥️⚠️ Error during cleanup for connection {connection_id}: {e}")
        
        logger.info(f"🖥️❌ WebSocket session {connection_id} ended.")

# --------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------
if __name__ == "__main__":

    # Run the server without SSL
    if not USE_SSL:
        logger.info("🖥️▶️ Starting server without SSL.")
        uvicorn.run("server:app", host="0.0.0.0", port=8000, log_config=None)

    else:
        logger.info("🖥️🔒 Attempting to start server with SSL.")
        # Check if cert files exist
        cert_file = "127.0.0.1+1.pem"
        key_file = "127.0.0.1+1-key.pem"
        if not os.path.exists(cert_file) or not os.path.exists(key_file):
             logger.error(f"🖥️💥 SSL cert file ({cert_file}) or key file ({key_file}) not found.")
             logger.error("🖥️💥 Please generate them using mkcert:")
             logger.error("🖥️💥   choco install mkcert") # Assuming Windows based on earlier check, adjust if needed
             logger.error("🖥️💥   mkcert -install")
             logger.error("🖥️💥   mkcert 127.0.0.1 YOUR_LOCAL_IP") # Remind user to replace with actual IP if needed
             logger.error("🖥️💥 Exiting.")
             sys.exit(1)

        # Run the server with SSL
        logger.info(f"🖥️▶️ Starting server with SSL (cert: {cert_file}, key: {key_file}).")
        uvicorn.run(
            "server:app",
            host="0.0.0.0",
            port=8000,
            log_config=None,
            ssl_certfile=cert_file,
            ssl_keyfile=key_file,
        )
