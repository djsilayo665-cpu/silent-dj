# Use a slim Node.js image
FROM node:22-slim

# Install git, ssh, build tools, ffmpeg, and libwebp
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    git \
    openssh-client \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 \
    ffmpeg \
    libwebp7 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure git to use HTTPS instead of SSH for GitHub
RUN git config --global url."https://github.com/".insteadOf git@github.com: && \
    git config --global url."https://".insteadOf git://

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

# Install all dependencies (including dev dependencies that might be needed for build)
RUN npm install

# Copy the rest of your application code
COPY . .

# Start the bot
CMD ["node", "index.js"]