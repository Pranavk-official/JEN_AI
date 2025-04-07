# JEN_AI

## Description

*TODO: Add a brief description of the project here.*

## Project Structure

-   `backend/`: Contains the backend application code.
-   `frontend/`: Contains the frontend application code.
-   `Dockerfile`: Defines the Docker image for the application.
-   `docker-compose.yml`: Defines the services, networks, and volumes for Docker Compose.
-   `jobs.groovy`: Contains the Jenkins pipeline definition for CI/CD.
-   `.env`: Environment variables (should not be committed to version control).
-   `.gitignore`: Specifies intentionally untracked files that Git should ignore.

## Setup and Running with Docker

This project uses Docker and Docker Compose for containerization and orchestration.

1.  **Prerequisites:**
    *   Docker: [Install Docker](https://docs.docker.com/get-docker/)
    *   Docker Compose: [Install Docker Compose](https://docs.docker.com/compose/install/)

2.  **Environment Variables:**
    *   Create a `.env` file in the root directory if it doesn't exist.
    *   Copy the contents of `.env.example` (if available) or add the necessary environment variables based on `docker-compose.yml`.

3.  **Build and Run:**
    *   Open a terminal in the project root directory.
    *   Run the command:
        ```bash
        docker-compose up --build
        ```
    *   This command will build the Docker images (if they don't exist) and start the services defined in `docker-compose.yml`.

4.  **Stopping the Application:**
    *   Press `Ctrl + C` in the terminal where `docker-compose up` is running.
    *   To remove the containers, run:
        ```bash
        docker-compose down
        ```

## CI/CD

This project uses Jenkins for Continuous Integration and Continuous Deployment. The pipeline is defined in the `jobs.groovy` file. 