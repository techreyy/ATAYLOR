# Image API untuk Hugging Face Spaces (Docker, gratis tanpa kartu). Salin file ini + README.md ke Space.
# Kode tidak disimpan di Space: diambil dari repo GitHub privat saat build memakai secret GITHUB_TOKEN.
FROM dunglas/frankenphp:1-php8.3

RUN install-php-extensions pdo_pgsql pgsql zip gd intl bcmath opcache \
    && apt-get update \
    && apt-get install -y --no-install-recommends git postgresql libcap2-bin \
    && rm -rf /var/lib/apt/lists/*
# Space berjalan sebagai user 1000 di port 7860 (bukan port istimewa), jadi capability bind port dilepas.
RUN setcap -r /usr/local/bin/frankenphp || true \
    && useradd -m -u 1000 user
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

RUN --mount=type=secret,id=GITHUB_TOKEN,mode=0444,required=true \
    git clone --depth 1 "https://x-access-token:$(cat /run/secrets/GITHUB_TOKEN)@github.com/techreyy/ATAYLOR.git" /tmp/src \
    && cp -a /tmp/src/API-ATAYLOR/. /app/ \
    && rm -rf /tmp/src

RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction \
    && composer dump-autoload --optimize --no-dev \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/private bootstrap/cache \
    && chown -R 1000:1000 /app

# Nilai bukan rahasia; yang rahasia (APP_KEY, SEED_USER_PASSWORD, DB_URL) diisi di Settings Space.
ENV PORT=7860 \
    HOME=/home/user \
    XDG_CONFIG_HOME=/tmp/.config \
    XDG_DATA_HOME=/tmp/.local/share \
    APP_ENV=production \
    APP_DEBUG=false \
    APP_TIMEZONE=Asia/Makassar \
    LOG_CHANNEL=stderr \
    DB_CONNECTION=pgsql \
    DEMO_LOGIN_ENABLED=false \
    CORS_ALLOWED_ORIGINS=* \
    SESSION_DRIVER=database \
    CACHE_STORE=database \
    QUEUE_CONNECTION=sync \
    FILESYSTEM_DISK=local

USER 1000
EXPOSE 7860

CMD ["sh", "docker/start-hf.sh"]
