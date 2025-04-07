FROM jenkins/jenkins:lts-jdk17

USER root

# Install necessary plugins with compatible versions
RUN jenkins-plugin-cli --plugins \
    job-dsl:1.87 \
    workflow-aggregator:596.v8c21c963d92d \
    git:5.7.0 \
    configuration-as-code:1932.v75cb_b_f1b_698d \
    credentials:1413.va_51c53703df1 \
    git-client:6.1.2 \
    pipeline-input-step:517.vf8e782ee645c \
    docker-workflow:1.29 \
    matrix-auth:3.1.7 \
    timestamper:1.18 \
    ws-cleanup:0.45

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create Jenkins configuration directory
RUN mkdir -p /usr/share/jenkins/ref/init.groovy.d

# Copy job creation script
COPY jobs.groovy /usr/share/jenkins/ref/init.groovy.d/jobs.groovy

# Set proper permissions
RUN chown -R jenkins:jenkins /usr/share/jenkins/ref/init.groovy.d

# Switch back to jenkins user for security
USER jenkins

# Set environment variables for Jenkins configuration
ENV JENKINS_REF="/usr/share/jenkins/ref"
ENV JENKINS_HOME="/var/jenkins_home" 