# Use a slim Node.js image
FROM node:22-slim

# Install runtime dependencies including git for npm install
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ffmpeg \
    libwebp7 \
    git \
    openssh-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure git to use HTTPS instead of SSH for GitHub
# This fixes the "ssh not found" error when installing from git URLs
RUN git config --global url."https://github.com/".insteadOf git@github.com: && \
    git config --global url."https://".insteadOf git://

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY .npmrc ./

# Install all dependencies (including dev dependencies if needed)
RUN npm install

# Copy the rest of your application code
COPY . .

# Start the bot
CMD ["node", "index.js"]
