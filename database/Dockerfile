FROM mysql:8.0

LABEL maintainer="MediConnect Pro DevOps"
LABEL description="Custom MySQL 8.0 database image with pre-configured schema and clinical seed data for Docker and AWS EKS"

ENV MYSQL_DATABASE=mediconnect_db
ENV MYSQL_ROOT_PASSWORD=rootpassword
ENV TZ=UTC

# Custom MySQL configuration tuned for container/Kubernetes workloads
COPY my.cnf /etc/mysql/conf.d/mediconnect.cnf

# Initialization SQL schema & seed data (runs automatically on fresh volume initialization)
COPY init.sql /docker-entrypoint-initdb.d/01-init.sql

RUN chmod 644 /etc/mysql/conf.d/mediconnect.cnf /docker-entrypoint-initdb.d/01-init.sql

EXPOSE 3306

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=10 \
  CMD mysqladmin ping -h 127.0.0.1 -u root -p"${MYSQL_ROOT_PASSWORD}" --silent || exit 1
