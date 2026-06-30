FROM node:22-slim

# Install git and all dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    git \
    openssh-client \
    ca-certificates \
    ffmpeg \
    libwebp7 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure git to use HTTPS for GitHub
RUN git config --global url."https://github.com/".insteadOf git@github.com: && \
    git config --global url."https://".insteadOf ssh://git@github.com/

WORKDIR /app

# Copy npmrc and package files
COPY .npmrc ./
COPY package*.json ./

# Install with verbose logging
RUN npm install

# Copy source code
COPY . .

# Start the bot
CMD ["node", "index.js"]
