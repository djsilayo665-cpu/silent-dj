RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    git \
    ffmpeg \
    libwebp7 && \
    rm -rf /var/lib/apt/lists/*
