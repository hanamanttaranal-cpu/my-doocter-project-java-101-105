# Build Stage
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# Run Stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

COPY --from=build /app/target/appointment-service-1.0.0.jar appointment-service.jar
RUN chown appuser:appgroup appointment-service.jar

USER appuser

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8082

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar appointment-service.jar"]
