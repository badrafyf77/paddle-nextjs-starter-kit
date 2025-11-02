import base64
from typing import Optional

class UpsampleOverlap:
    """
    Simple pass-through audio encoder (no upsampling).

    This class directly encodes audio chunks from 24kHz PCM to Base64 without
    any upsampling or processing. This eliminates the CPU-intensive resampling
    bottleneck and reduces latency significantly.
    """
    def __init__(self):
        """
        Initializes the audio encoder.
        """
        pass  # No state needed for pass-through

    def get_base64_chunk(self, chunk: bytes) -> str:
        """
        Encodes an audio chunk directly to Base64 without upsampling.

        Args:
            chunk: Raw audio data bytes (PCM 16-bit signed integer format at 24kHz).

        Returns:
            A Base64 encoded string representing the audio chunk.
            Returns an empty string if the input chunk is empty.
        """
        if not chunk or len(chunk) == 0:
            return ""  # Return empty string for empty input chunk

        # Direct Base64 encoding without any processing
        return base64.b64encode(chunk).decode('utf-8')

    def flush_base64_chunk(self) -> Optional[str]:
        """
        No-op flush method for compatibility.

        Returns:
            None (no buffering in pass-through mode).
        """
        return None  # No buffering, nothing to flush