"""
Integration helpers to add performance monitoring to existing code
"""
import time
import logging
from functools import wraps
from contextlib import contextmanager
from performance_monitor import get_monitor

logger = logging.getLogger(__name__)

class PerformanceTracker:
    """Helper class to track performance for a specific connection"""
    
    def __init__(self, conn_id: str):
        self.conn_id = conn_id
        self.monitor = get_monitor()
        self.timers = {}
        
    def start_timer(self, stage: str):
        """Start timing a stage"""
        self.timers[stage] = time.time()
    
    def end_timer(self, stage: str):
        """End timing a stage and record latency"""
        if stage in self.timers:
            latency_ms = (time.time() - self.timers[stage]) * 1000
            self.monitor.record_latency(self.conn_id, stage, latency_ms)
            del self.timers[stage]
            return latency_ms
        return None
    
    @contextmanager
    def measure(self, stage: str):
        """Context manager to measure a code block"""
        start = time.time()
        try:
            yield
        finally:
            latency_ms = (time.time() - start) * 1000
            self.monitor.record_latency(self.conn_id, stage, latency_ms)
    
    def record_audio(self, bytes_count: int):
        """Record audio throughput"""
        self.monitor.record_throughput(self.conn_id, audio_bytes=bytes_count)
    
    def record_text(self, char_count: int):
        """Record text generation throughput"""
        self.monitor.record_throughput(self.conn_id, text_chars=char_count)
    
    def record_tts(self, bytes_count: int):
        """Record TTS throughput"""
        self.monitor.record_throughput(self.conn_id, tts_bytes=bytes_count)
    
    def record_error(self, error_type: str):
        """Record an error event"""
        self.monitor.record_quality_event(self.conn_id, error_type)
    
    def record_interruption(self):
        """Record user interruption"""
        self.monitor.record_quality_event(self.conn_id, "interruptions")
    
    def record_turn_complete(self):
        """Record completed conversation turn"""
        self.monitor.record_turn_complete(self.conn_id)

def measure_latency(stage: str):
    """Decorator to measure function latency"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Try to find conn_id in args/kwargs
            conn_id = kwargs.get('conn_id') or (args[0] if args and hasattr(args[0], 'conn_id') else 'unknown')
            
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                latency_ms = (time.time() - start) * 1000
                get_monitor().record_latency(str(conn_id), stage, latency_ms)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            conn_id = kwargs.get('conn_id') or (args[0] if args and hasattr(args[0], 'conn_id') else 'unknown')
            
            start = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                latency_ms = (time.time() - start) * 1000
                get_monitor().record_latency(str(conn_id), stage, latency_ms)
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
