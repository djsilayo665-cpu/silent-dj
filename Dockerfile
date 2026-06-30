FROM node:22-slim

# Install git and other dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ffmpeg \
    libwebp7 \
    git \
    openssh-client \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure git to use HTTPS for GitHub (simplified)
RUN git config --global url."https://github.com/".insteadOf git@github.com: && \
    git config --global url."https://github.com/".insteadOf ssh://git@github.com:

# Set working directory
WORKDIR /app

# Copy npmrc first (important!)
COPY .npmrc* ./

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Start the bot
CMD ["node", "index.js"]
