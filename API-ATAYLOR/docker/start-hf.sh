#!/bin/sh
# Hugging Face Spaces: APP_URL dari SPACE_HOST; bila DB_URL kosong (mis. port 5432 ke Neon diblokir),
# jalankan PostgreSQL di dalam container. Data lokal hilang saat Space restart/tidur — data contoh
# terisi ulang otomatis oleh app:prepare-deploy. Setelah itu sama dengan Render (docker/start.sh).
set -e

if [ -z "$APP_URL" ] && [ -n "$SPACE_HOST" ]; then
    export APP_URL="https://$SPACE_HOST"
fi

if [ -z "$DB_URL" ]; then
    PGBIN=$(ls -d /usr/lib/postgresql/*/bin | tail -n 1)
    PGDATA=/tmp/pgdata
    "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust > /dev/null
    "$PGBIN/pg_ctl" -D "$PGDATA" -o "-c listen_addresses=127.0.0.1 -k /tmp" -l /tmp/postgres.log -w start
    # Role aplikasi bukan superuser agar Row-Level Security tetap berlaku.
    "$PGBIN/psql" -h 127.0.0.1 -U postgres -q \
        -c "CREATE ROLE ataylor_app LOGIN PASSWORD 'lokal'" \
        -c "CREATE DATABASE ataylor OWNER ataylor_app"
    export DB_URL="postgresql://ataylor_app:lokal@127.0.0.1:5432/ataylor"
    echo "DB_URL kosong: memakai PostgreSQL lokal di container (data sementara)."
fi

exec sh docker/start.sh
