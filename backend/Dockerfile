# Dockerfile for Python backend

# Use Python 3.11 slim image for lightweight container
FROM python:3.11-slim

# Install system dependencies including build tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        chromium-driver \
        build-essential \
        python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory in the Docker container
WORKDIR /backend

# Copy the requirements file into the container
COPY requirements.txt .

# Upgrade pip, setuptools, wheel and install Python dependencies
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of your app code into container
COPY . .

# Expose port 8000 (or any port your backend listens on)
EXPOSE 8000

# Command to run your Python backend when the container starts
CMD ["python", "flask_end_point.py"]