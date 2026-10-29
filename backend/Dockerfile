FROM postgres:17-alpine

EXPOSE 5432

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
CMD pg_isready -U ${DB_USER} -d ${DB_DB} || exit 1