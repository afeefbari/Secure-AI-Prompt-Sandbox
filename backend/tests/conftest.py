"""
conftest.py — pytest configuration for Secure AI Prompt Sandbox test suite.
Sets sys.path so imports resolve from backend/ directory without installation.
"""
import sys
import os

# Ensure backend/ is on the path so `from security.validator import ...` works
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
