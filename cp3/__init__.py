"""CP3 extensions. Original starter files stay unchanged."""
import sys
from pathlib import Path

# Reuse the starter tracing decorators rather than copying/modifying the framework.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'codebase'))
