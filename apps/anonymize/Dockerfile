FROM greenmask/greenmask:v0.2.6

USER root
RUN apt-get update && apt-get install -y --no-install-recommends gettext-base && rm -rf /var/lib/apt/lists/*
USER greenmask
RUN mkdir -p /tmp/greenmask-dumps

COPY greenmask.yml /app/greenmask.yml
COPY entrypoint.sh /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
