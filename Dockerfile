FROM node:22-slim

# Install git, ssh, and build tools
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    git \
    openssh-client \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Convert SSH to HTTPS for GitHub
RUN git config --global url."https://github.com/".insteadOf git@github.com: && \
    git config --global url."https://".insteadOf git://

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Start the bot
CMD ["node", "index.js"]
