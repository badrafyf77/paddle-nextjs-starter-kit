"""Bedrock Agent LLM backend for voice chat."""
import os
import time
import uuid
import logging
import threading
from typing import Generator, Optional, Dict, Any

import boto3
from botocore.exceptions import ClientError, BotoCoreError
from botocore.config import Config as BotoConfig

logger = logging.getLogger(__name__)

# Silence noisy AWS SDK logs
for name in ("botocore", "botocore.parsers", "botocore.hooks", "botocore.endpoint", 
             "botocore.retries", "boto3", "urllib3"):
    logging.getLogger(name).setLevel(logging.WARNING)

DEFAULT_AWS_REGION = os.environ.get("AWS_REGION", "us-west-2")
DEFAULT_AGENT_ID = os.environ.get("BEDROCK_AGENT_ID", "VUEHUL2HDK")
DEFAULT_AGENT_ALIAS_ID = os.environ.get("BEDROCK_AGENT_ALIAS_ID", "JBU23UII65")
DEFAULT_GUARDRAIL_INTERVAL = int(os.environ.get("BEDROCK_GUARDRAIL_INTERVAL", "10"))
DEFAULT_RETRY_ATTEMPTS = int(os.environ.get("BEDROCK_RETRY_ATTEMPTS", "3"))

class BedrockError(Exception):
    pass

class BedrockResourceNotFound(BedrockError):
    pass

class BedrockValidationError(BedrockError):
    pass

class BedrockThrottlingError(BedrockError):
    pass

class BedrockAccessDenied(BedrockError):
    pass

class BedrockInternalError(BedrockError):
    pass

class CancellationToken:
    def __init__(self):
        self._event = threading.Event()
    
    def cancel(self):
        self._event.set()
    
    def is_cancelled(self) -> bool:
        return self._event.is_set()
    
    def reset(self):
        self._event.clear()

class BedrockAgentLLM:
    def __init__(
        self,
        agent_id: str = DEFAULT_AGENT_ID,
        agent_alias_id: str = DEFAULT_AGENT_ALIAS_ID,
        region_name: str = DEFAULT_AWS_REGION,
        boto_config: Optional[BotoConfig] = None
    ):
        self.agent_id = agent_id
        self.agent_alias_id = agent_alias_id
        self.region_name = region_name
        
        self.boto_config = boto_config or BotoConfig(
            retries={"max_attempts": DEFAULT_RETRY_ATTEMPTS},
            read_timeout=60,
            connect_timeout=10
        )
        
        logger.info(f"🤖🔌 Initializing Bedrock Agent client (region={region_name}, agent={agent_id})")
        try:
            self.client = boto3.client(
                "bedrock-agent-runtime",
                region_name=self.region_name,
                config=self.boto_config
            )
            logger.info("🤖✅ Bedrock Agent client initialized successfully")
        except Exception as e:
            logger.exception("🤖💥 Failed to initialize Bedrock Agent client")
            raise BedrockError("Failed to initialize Bedrock client") from e
        
        self._active_requests: Dict[str, Dict[str, Any]] = {}
        self._requests_lock = threading.Lock()
    
    def _map_client_error(self, exc: ClientError) -> BedrockError:
        code = exc.response.get("Error", {}).get("Code", "")
        msg = str(exc)
        
        if code in ("ResourceNotFoundException", "NotFoundException"):
            return BedrockResourceNotFound(msg)
        if code in ("ValidationException",):
            return BedrockValidationError(msg)
        if code in ("ThrottlingException", "Throttling"):
            return BedrockThrottlingError(msg)
        if code in ("AccessDeniedException", "UnauthorizedOperation"):
            return BedrockAccessDenied(msg)
        if code in ("InternalServerException", "InternalError"):
            return BedrockInternalError(msg)
        
        return BedrockError(msg)
    
    def _register_request(self, request_id: str, cancel_token: CancellationToken):
        with self._requests_lock:
            self._active_requests[request_id] = {
                "type": "bedrock",
                "cancel_token": cancel_token,
                "start_time": time.time()
            }
            logger.debug(f"🤖ℹ️ Registered request: {request_id}")
    
    def _unregister_request(self, request_id: str):
        with self._requests_lock:
            if request_id in self._active_requests:
                del self._active_requests[request_id]
                logger.debug(f"🤖ℹ️ Unregistered request: {request_id}")
    
    def cancel_generation(self, request_id: Optional[str] = None) -> bool:
        cancelled_any = False
        
        with self._requests_lock:
            if request_id is None:
                if not self._active_requests:
                    return False
                ids_to_cancel = list(self._active_requests.keys())
            else:
                if request_id not in self._active_requests:
                    return False
                ids_to_cancel = [request_id]
            
            for req_id in ids_to_cancel:
                req_data = self._active_requests.get(req_id)
                if req_data:
                    cancel_token = req_data.get("cancel_token")
                    if cancel_token:
                        cancel_token.cancel()
                        cancelled_any = True
        
        return cancelled_any
    
    def generate(
        self,
        text: str,
        session_id: str,
        request_id: Optional[str] = None,
        enable_trace: bool = False,
        end_session: bool = False,
        streaming_config: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Generator[str, None, None]:
        request_id = request_id or f"bedrock-{uuid.uuid4()}"
        cancel_token = CancellationToken()
        
        self._register_request(request_id, cancel_token)
        
        try:
            if streaming_config is None:
                streaming_config = {
                    "streamFinalResponse": True,
                    "applyGuardrailInterval": DEFAULT_GUARDRAIL_INTERVAL,
                }
            
            invoke_kwargs = {
                "agentId": self.agent_id,
                "sessionId": session_id,
                "inputText": text,
                "streamingConfigurations": streaming_config,
                "enableTrace": enable_trace,
                "endSession": end_session,
            }
            
            if self.agent_alias_id:
                invoke_kwargs["agentAliasId"] = self.agent_alias_id
            
            invoke_kwargs = {k: v for k, v in invoke_kwargs.items() if v is not None}
            
            logger.info(f"🤖🚀 [{request_id}] Invoking Bedrock Agent (session={session_id})")
            
            attempts = 0
            backoff = 0.5
            
            while attempts < DEFAULT_RETRY_ATTEMPTS:
                attempts += 1
                
                if cancel_token.is_cancelled():
                    logger.info(f"🤖🛑 [{request_id}] Cancelled before invoke")
                    return
                
                try:
                    response = self.client.invoke_agent(**invoke_kwargs)
                    stream = response.get("completion")
                    
                    if stream is None:
                        text_output = response.get("outputText") or response.get("response") or ""
                        if text_output:
                            yield text_output
                        return
                    
                    token_count = 0
                    start_time = time.time()
                    
                    for event in stream:
                        if cancel_token.is_cancelled():
                            logger.info(f"🤖🛑 [{request_id}] Cancelled during streaming")
                            return
                        
                        if "chunk" in event:
                            chunk_data = event["chunk"]
                            bytes_obj = chunk_data.get("bytes") if isinstance(chunk_data, dict) else chunk_data
                            
                            try:
                                text_chunk = bytes_obj.decode("utf-8")
                            except Exception:
                                text_chunk = bytes_obj.decode("utf-8", errors="replace")
                            
                            token_count += 1
                            if token_count == 1:
                                ttft = time.time() - start_time
                                logger.info(f"🤖⏱️ [{request_id}] TTFT: {ttft:.4f}s")
                            
                            yield text_chunk
                        
                        elif "trace" in event and enable_trace:
                            logger.debug(f"🤖🔍 [{request_id}] Trace: {event['trace']}")
                        
                        elif "completion" in event:
                            logger.info(f"🤖✅ [{request_id}] Stream completed ({token_count} chunks)")
                            return
                    
                    logger.info(f"🤖✅ [{request_id}] Stream ended ({token_count} chunks)")
                    return
                
                except ClientError as ce:
                    mapped = self._map_client_error(ce)
                    logger.error(f"🤖💥 [{request_id}] ClientError (attempt {attempts}/{DEFAULT_RETRY_ATTEMPTS}): {mapped}")
                    
                    if isinstance(mapped, (BedrockResourceNotFound, BedrockValidationError, BedrockAccessDenied)):
                        raise mapped from ce
                    
                    if attempts < DEFAULT_RETRY_ATTEMPTS:
                        sleep_time = backoff * attempts
                        logger.warning(f"🤖🔄 [{request_id}] Retrying in {sleep_time:.2f}s...")
                        time.sleep(sleep_time)
                        continue
                    
                    raise mapped from ce
                
                except BotoCoreError as bce:
                    logger.exception(f"🤖💥 [{request_id}] BotoCoreError")
                    if attempts < DEFAULT_RETRY_ATTEMPTS:
                        time.sleep(backoff * attempts)
                        continue
                    raise BedrockError(str(bce)) from bce
                
                except Exception as e:
                    logger.exception(f"🤖💥 [{request_id}] Unexpected error")
                    raise BedrockError(str(e)) from e
        
        finally:
            self._unregister_request(request_id)
    
    def cleanup_stale_requests(self, timeout_seconds: int = 300) -> int:
        stale_ids = []
        now = time.time()
        
        with self._requests_lock:
            stale_ids = [
                req_id for req_id, req_data in self._active_requests.items()
                if (now - req_data.get("start_time", 0)) > timeout_seconds
            ]
        
        if stale_ids:
            cleaned = 0
            for req_id in stale_ids:
                if self.cancel_generation(req_id):
                    cleaned += 1
            return cleaned
        
        return 0

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    llm = BedrockAgentLLM()
    session_id = str(uuid.uuid4())
    
    print("Testing Bedrock Agent streaming...\n")
    
    try:
        for chunk in llm.generate(
            text="Tell me a short story about AI",
            session_id=session_id,
            request_id="test-001"
        ):
            print(chunk, end="", flush=True)
        print("\n\nDone!")
    except BedrockError as e:
        print(f"\nError: {e}")
