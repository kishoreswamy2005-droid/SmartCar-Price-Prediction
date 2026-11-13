#!/usr/bin/env python3

# Check if the virtual environment is working
import sys
import subprocess

# Try to run python directly
result = subprocess.run([sys.executable, "-c", "print('Python version:', sys.version)"], 
                       capture_output=True, text=True)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("Return code:", result.returncode)

# Check if we can import key modules
try:
    import fastapi
    print("✓ fastapi imported successfully")
except ImportError as e:
    print("✗ fastapi import failed:", e)

try:
    import uvicorn
    print("✓ uvicorn imported successfully")
except ImportError as e:
    print("✗ uvicorn import failed:", e)

try:
    import pandas
    print("✓ pandas imported successfully")
except ImportError as e:
    print("✗ pandas import failed:", e)

try:
    import numpy
    print("✓ numpy imported successfully")
except ImportError as e:
    print("✗ numpy import failed:", e)

try:
    import sklearn
    print("✓ sklearn imported successfully")
except ImportError as e:
    print("✗ sklearn import failed:", e)

try:
    import joblib
    print("✓ joblib imported successfully")
except ImportError as e:
    print("✗ joblib import failed:", e)

try:
    import motor
    print("✓ motor imported successfully")
except ImportError as e:
    print("✗ motor import failed:", e)