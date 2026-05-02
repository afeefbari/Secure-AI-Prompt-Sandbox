"""
conftest.py — pytest configuration for Secure AI Prompt Sandbox test suite.
Sets sys.path so imports resolve from Deliverable2/backend/ directory.
"""
import sys
import os

# Deliverable3/tests/ → project root (2 levels up) → Deliverable2/backend/
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_backend = os.path.join(_tests_dir, "..", "..", "Deliverable2", "backend")
sys.path.insert(0, os.path.normpath(_backend))
