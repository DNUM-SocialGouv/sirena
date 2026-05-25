FROM greenmask/greenmask:v0.2.20

# Le build est non reproductible volontairement : on récupère les correctifs
# de sécurité Debian publiés depuis le tag amont (greenmask/greenmask:v0.2.20
# est lui-même rebâti rarement).
USER root
RUN apt-get update \
    && apt-get -y --no-install-recommends upgrade \
    && apt-get install -y --no-install-recommends gettext-base jq \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
USER greenmask
RUN mkdir -p /tmp/greenmask-dumps

COPY greenmask.yml /app/greenmask.yml
COPY entrypoint.sh /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
