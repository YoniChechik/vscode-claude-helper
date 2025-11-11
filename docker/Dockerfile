# syntax = docker/dockerfile:1

FROM ubuntu:24.04 AS base

# ==== env vars
# doing the env below to discart this error
# debconf: (TERM is not set, so the dialog frontend is not usable.)
# debconf: falling back to frontend: Readline
ENV DEBIAN_FRONTEND=noninteractive
# Timezone
ENV TZ=Asia/Jerusalem
# disable UserWarning: A new version of Albumentations is available: xxx (you have yyy).
ENV NO_ALBUMENTATIONS_UPDATE=1

# ===== uv
# download specific uv version already compiled
COPY --from=ghcr.io/astral-sh/uv:0.9.3 /uv /uvx /bin/
# A cache mount can be used to improve performance across builds
# Changing the default UV_LINK_MODE silences warnings about not being able to use hard links since the cache and sync target are on separate file systems.
ENV UV_LINK_MODE=copy
ENV UV_PROJECT_ENVIRONMENT=/venv \
    PATH=/venv/bin:$PATH

WORKDIR /root/vscode-claude-helper 

RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \
    --mount=target=/var/cache/apt,type=cache,sharing=locked \
# ==== base
apt-get update && \
# ==== git
apt-get install -y git && \
# ==== timezone
apt-get install -y tzdata && \
echo $TZ | tee /etc/timezone

# ========== dev image
FROM base AS dev

# ==== zsh
ADD https://github.com/deluan/zsh-in-docker/releases/download/v1.2.1/zsh-in-docker.sh /zsh-in-docker.sh
RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \
    --mount=target=/var/cache/apt,type=cache,sharing=locked \
    sh -c "$(cat /zsh-in-docker.sh)" -- \
       -t robbyrussell \
       -p git \
       -p https://github.com/zsh-users/zsh-syntax-highlighting \
       -p https://github.com/zsh-users/zsh-autosuggestions && \
    # Set zsh as default shell
    chsh -s /bin/zsh root

# ==== claude
# set claude config dir to a mountable location
ENV CLAUDE_CONFIG_DIR=/home/node/.claude
# add sandbox mode so claude can run dangerously
# https://github.com/anthropics/claude-code/issues/3490
ENV IS_SANDBOX=1
# Install Node.js and npm for Claude Code CLI
RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \
    --mount=target=/var/cache/apt,type=cache,sharing=locked \
    apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g @anthropic-ai/claude-code

# ==== uv
RUN --mount=type=bind,source=.,target=/root/vscode-claude-helper,rw \
    --mount=type=cache,target=/root/.cache/uv \
    UV_COMPILE_BYTECODE=1  \
    uv venv --seed \
    && uv sync --frozen --all-packages

# ==== github cli
# from: https://github.com/cli/cli/blob/trunk/docs/install_linux.md#debian-ubuntu-linux-raspberry-pi-os-apt
RUN (type -p wget >/dev/null || (apt-get update && apt-get install wget -y)) \
	&& mkdir -p -m 755 /etc/apt/keyrings \
	&& out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
	&& cat $out | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
	&& chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
	&& mkdir -p -m 755 /etc/apt/sources.list.d \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
	&& apt-get update \
	&& apt-get install gh -y

# ==== git safe directories
# Mark repo directory as safe to avoid git ownership warnings
RUN git config --global --add safe.directory /root/vscode-claude-helper

# ========== prod image
FROM base AS production

RUN --mount=type=bind,source=.,target=/root/vscode-claude-helper,rw \
    --mount=type=cache,target=/root/.cache/uv \
    UV_COMPILE_BYTECODE=1  \
    uv venv --seed \
    &&  uv sync --frozen --all-packages --no-dev
