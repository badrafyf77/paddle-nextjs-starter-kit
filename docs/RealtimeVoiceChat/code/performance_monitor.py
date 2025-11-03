"""
Professional Performance Monitoring for Real-time Voice Chat
Tracks latency, throughput, quality metrics, and system resources
"""
import time
import psutil
import logging
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional
import statistics
import json

logger = logging.getLogger(__name__)

@dataclass
class LatencyMetrics:
    """Track latency at each stage of the pipeline"""
    audio_capture_to_server: List[float] = field(default_factory=list)
    transcription_time: List[float] = field(default_factory=list)
    llm_first_token: List[float] = field(default_factory=list)
    llm_total_time: List[float] = field(default_factory=list)
    tts_first_chunk: List[float] = field(default_factory=list)
    tts_total_time: List[float] = field(default_factory=list)
    end_to_end: List[float] = field(default_factory=list)  # User stops talking -> First audio plays
    
    def add_metric(self, metric_name: str, value: float):
        """Add a metric value"""
        if hasattr(self, metric_name):
            getattr(self, metric_name).append(value)
    
    def get_stats(self, metric_name: str) -> Dict:
        """Get statistics for a metric"""
        values = getattr(self, metric_name, [])
        if not values:
            return {"count": 0}
        
        return {
            "count": len(values),
            "mean": statistics.mean(values),
            "median": statistics.median(values),
            "p95": statistics.quantiles(values, n=20)[18] if len(values) >= 20 else max(values),
            "p99": statistics.quantiles(values, n=100)[98] if len(values) >= 100 else max(values),
            "min": min(values),
            "max": max(values),
        }

@dataclass
class QualityMetrics:
    """Track quality and reliability metrics"""
    interruptions: int = 0
    audio_drops: int = 0
    transcription_errors: int = 0
    llm_errors: int = 0
    tts_errors: int = 0
    websocket_disconnects: int = 0
    queue_overflows: int = 0
    
    # Quality scores
    transcription_confidence: List[float] = field(default_factory=list)
    user_interruption_rate: float = 0.0
    
    def increment(self, metric_name: str):
        """Increment an error counter"""
        if hasattr(self, metric_name):
            setattr(self, metric_name, getattr(self, metric_name) + 1)

@dataclass
class ThroughputMetrics:
    """Track throughput and capacity"""
    total_audio_processed_mb: float = 0.0
    total_text_generated_chars: int = 0
    total_tts_generated_mb: float = 0.0
    concurrent_users: int = 0
    peak_concurrent_users: int = 0
    total_sessions: int = 0
    active_sessions: int = 0

class PerformanceMonitor:
    """
    Professional performance monitoring system
    Tracks all critical metrics for real-time voice chat
    """
    
    def __init__(self, window_size: int = 100):
        """
        Initialize performance monitor
        
        Args:
            window_size: Number of recent samples to keep for rolling metrics
        """
        self.window_size = window_size
        self.start_time = time.time()
        
        # Per-connection metrics
        self.connections: Dict[str, Dict] = {}
        
        # Global metrics
        self.latency = LatencyMetrics()
        self.quality = QualityMetrics()
        self.throughput = ThroughputMetrics()
        
        # System metrics
        self.cpu_usage = deque(maxlen=window_size)
        self.memory_usage = deque(maxlen=window_size)
        self.gpu_usage = deque(maxlen=window_size)  # If available
        
        # Timing windows for rate calculations
        self.recent_requests = deque(maxlen=window_size)
        
        logger.info("📊 Performance Monitor initialized")
    
    def start_connection(self, conn_id: str):
        """Start tracking a new connection"""
        self.connections[conn_id] = {
            "start_time": time.time(),
            "latency": LatencyMetrics(),
            "quality": QualityMetrics(),
            "audio_bytes": 0,
            "text_chars": 0,
            "turns": 0,
        }
        self.throughput.active_sessions += 1
        self.throughput.total_sessions += 1
        self.throughput.concurrent_users = len(self.connections)
        self.throughput.peak_concurrent_users = max(
            self.throughput.peak_concurrent_users,
            self.throughput.concurrent_users
        )
        logger.info(f"📊 Connection {conn_id} started. Active: {self.throughput.concurrent_users}")
    
    def end_connection(self, conn_id: str):
        """End tracking a connection"""
        if conn_id in self.connections:
            duration = time.time() - self.connections[conn_id]["start_time"]
            logger.info(f"📊 Connection {conn_id} ended. Duration: {duration:.2f}s")
            del self.connections[conn_id]
            self.throughput.active_sessions -= 1
            self.throughput.concurrent_users = len(self.connections)
    
    def record_latency(self, conn_id: str, stage: str, latency_ms: float):
        """
        Record latency for a specific stage
        
        Args:
            conn_id: Connection identifier
            stage: Stage name (e.g., 'transcription_time', 'llm_first_token')
            latency_ms: Latency in milliseconds
        """
        # Global metrics
        self.latency.add_metric(stage, latency_ms)
        
        # Per-connection metrics
        if conn_id in self.connections:
            self.connections[conn_id]["latency"].add_metric(stage, latency_ms)
        
        # Log if latency is concerning
        if latency_ms > 1000:  # > 1 second
            logger.warning(f"⚠️ High latency detected: {stage} = {latency_ms:.0f}ms")
    
    def record_quality_event(self, conn_id: str, event_type: str):
        """
        Record a quality event (error, interruption, etc.)
        
        Args:
            conn_id: Connection identifier
            event_type: Event type (e.g., 'interruptions', 'audio_drops')
        """
        # Global metrics
        self.quality.increment(event_type)
        
        # Per-connection metrics
        if conn_id in self.connections:
            self.connections[conn_id]["quality"].increment(event_type)
    
    def record_throughput(self, conn_id: str, audio_bytes: int = 0, text_chars: int = 0, tts_bytes: int = 0):
        """Record throughput metrics"""
        if audio_bytes:
            self.throughput.total_audio_processed_mb += audio_bytes / 1_000_000
            if conn_id in self.connections:
                self.connections[conn_id]["audio_bytes"] += audio_bytes
        
        if text_chars:
            self.throughput.total_text_generated_chars += text_chars
            if conn_id in self.connections:
                self.connections[conn_id]["text_chars"] += text_chars
        
        if tts_bytes:
            self.throughput.total_tts_generated_mb += tts_bytes / 1_000_000
    
    def record_turn_complete(self, conn_id: str):
        """Record a completed conversation turn"""
        if conn_id in self.connections:
            self.connections[conn_id]["turns"] += 1
        self.recent_requests.append(time.time())
    
    def update_system_metrics(self):
        """Update system resource metrics"""
        try:
            self.cpu_usage.append(psutil.cpu_percent(interval=0.1))
            self.memory_usage.append(psutil.virtual_memory().percent)
            
            # GPU metrics if available (requires pynvml)
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                gpu_util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                self.gpu_usage.append(gpu_util.gpu)
            except:
                pass  # GPU monitoring not available
        except Exception as e:
            logger.debug(f"Error updating system metrics: {e}")
    
    def get_summary(self) -> Dict:
        """Get comprehensive performance summary"""
        uptime = time.time() - self.start_time
        
        # Calculate request rate
        now = time.time()
        recent_window = 60  # Last 60 seconds
        recent_count = sum(1 for t in self.recent_requests if now - t < recent_window)
        requests_per_minute = (recent_count / recent_window) * 60 if recent_window > 0 else 0
        
        summary = {
            "uptime_seconds": uptime,
            "timestamp": time.time(),
            
            # Latency metrics (all stages)
            "latency": {
                "audio_capture_to_server_ms": self.latency.get_stats("audio_capture_to_server"),
                "transcription_ms": self.latency.get_stats("transcription_time"),
                "llm_first_token_ms": self.latency.get_stats("llm_first_token"),
                "llm_total_ms": self.latency.get_stats("llm_total_time"),
                "tts_first_chunk_ms": self.latency.get_stats("tts_first_chunk"),
                "tts_total_ms": self.latency.get_stats("tts_total_time"),
                "end_to_end_ms": self.latency.get_stats("end_to_end"),
            },
            
            # Quality metrics
            "quality": {
                "interruptions": self.quality.interruptions,
                "audio_drops": self.quality.audio_drops,
                "transcription_errors": self.quality.transcription_errors,
                "llm_errors": self.quality.llm_errors,
                "tts_errors": self.quality.tts_errors,
                "websocket_disconnects": self.quality.websocket_disconnects,
                "queue_overflows": self.quality.queue_overflows,
                "error_rate_percent": self._calculate_error_rate(),
            },
            
            # Throughput metrics
            "throughput": {
                "total_audio_processed_mb": round(self.throughput.total_audio_processed_mb, 2),
                "total_text_generated_chars": self.throughput.total_text_generated_chars,
                "total_tts_generated_mb": round(self.throughput.total_tts_generated_mb, 2),
                "concurrent_users": self.throughput.concurrent_users,
                "peak_concurrent_users": self.throughput.peak_concurrent_users,
                "total_sessions": self.throughput.total_sessions,
                "requests_per_minute": round(requests_per_minute, 2),
            },
            
            # System metrics
            "system": {
                "cpu_percent": round(statistics.mean(self.cpu_usage), 1) if self.cpu_usage else 0,
                "memory_percent": round(statistics.mean(self.memory_usage), 1) if self.memory_usage else 0,
                "gpu_percent": round(statistics.mean(self.gpu_usage), 1) if self.gpu_usage else None,
            },
            
            # Active connections summary
            "connections": {
                "active": len(self.connections),
                "details": self._get_connection_summaries(),
            }
        }
        
        return summary
    
    def _calculate_error_rate(self) -> float:
        """Calculate overall error rate"""
        total_errors = (
            self.quality.transcription_errors +
            self.quality.llm_errors +
            self.quality.tts_errors +
            self.quality.websocket_disconnects
        )
        total_requests = len(self.latency.end_to_end)
        
        if total_requests == 0:
            return 0.0
        
        return round((total_errors / total_requests) * 100, 2)
    
    def _get_connection_summaries(self) -> List[Dict]:
        """Get summary for each active connection"""
        summaries = []
        for conn_id, conn_data in self.connections.items():
            duration = time.time() - conn_data["start_time"]
            summaries.append({
                "id": conn_id,
                "duration_seconds": round(duration, 1),
                "turns": conn_data["turns"],
                "audio_mb": round(conn_data["audio_bytes"] / 1_000_000, 2),
                "text_chars": conn_data["text_chars"],
            })
        return summaries
    
    def print_summary(self):
        """Print formatted performance summary"""
        summary = self.get_summary()
        
        print("\n" + "="*80)
        print("📊 REAL-TIME VOICE CHAT PERFORMANCE REPORT")
        print("="*80)
        
        print(f"\n⏱️  UPTIME: {summary['uptime_seconds']/3600:.1f} hours")
        
        print("\n🚀 LATENCY METRICS (milliseconds)")
        print("-" * 80)
        for stage, stats in summary['latency'].items():
            if stats['count'] > 0:
                print(f"  {stage:30s} | Mean: {stats['mean']:6.1f} | P95: {stats['p95']:6.1f} | P99: {stats['p99']:6.1f}")
        
        print("\n✅ QUALITY METRICS")
        print("-" * 80)
        q = summary['quality']
        print(f"  Error Rate: {q['error_rate_percent']}%")
        print(f"  Interruptions: {q['interruptions']}")
        print(f"  Audio Drops: {q['audio_drops']}")
        print(f"  Errors: Transcription={q['transcription_errors']}, LLM={q['llm_errors']}, TTS={q['tts_errors']}")
        
        print("\n📈 THROUGHPUT METRICS")
        print("-" * 80)
        t = summary['throughput']
        print(f"  Concurrent Users: {t['concurrent_users']} (Peak: {t['peak_concurrent_users']})")
        print(f"  Total Sessions: {t['total_sessions']}")
        print(f"  Requests/min: {t['requests_per_minute']}")
        print(f"  Audio Processed: {t['total_audio_processed_mb']} MB")
        print(f"  Text Generated: {t['total_text_generated_chars']:,} chars")
        
        print("\n💻 SYSTEM RESOURCES")
        print("-" * 80)
        s = summary['system']
        print(f"  CPU: {s['cpu_percent']}%")
        print(f"  Memory: {s['memory_percent']}%")
        if s['gpu_percent']:
            print(f"  GPU: {s['gpu_percent']}%")
        
        print("\n" + "="*80 + "\n")
    
    def export_metrics(self, filepath: str):
        """Export metrics to JSON file"""
        summary = self.get_summary()
        with open(filepath, 'w') as f:
            json.dump(summary, f, indent=2)
        logger.info(f"📊 Metrics exported to {filepath}")

# Global instance
_monitor = None

def get_monitor() -> PerformanceMonitor:
    """Get or create global performance monitor instance"""
    global _monitor
    if _monitor is None:
        _monitor = PerformanceMonitor()
    return _monitor
