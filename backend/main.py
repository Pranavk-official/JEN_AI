from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from fastapi.middleware.cors import CORSMiddleware
import jenkins
import asyncio
import os

app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:3000",  # Allow Next.js frontend
    "http://localhost",
    # Add other origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Jenkins Configuration - Replace with your Jenkins server details
JENKINS_URL = os.environ.get("JENKINS_URL", "http://localhost:8080")
JENKINS_USERNAME = os.environ.get("JENKINS_USERNAME", "your_jenkins_username")
JENKINS_PASSWORD = os.environ.get("JENKINS_PASSWORD", "your_jenkins_api_token_or_password")


def get_jenkins_server():
    try:
        server = jenkins.Jenkins(JENKINS_URL, username=JENKINS_USERNAME, password=JENKINS_PASSWORD)
        server.get_whoami() # Verify connection
        print(f"Successfully connected to Jenkins at {JENKINS_URL}")
        return server
    except jenkins.JenkinsException as e:
        print(f"Failed to connect to Jenkins: {e}")
        return None

server = get_jenkins_server()

@app.get("/api/jobs")
async def get_jobs():
    if not server:
        return {"error": "Jenkins server connection failed"}
    try:
        jobs_list = server.get_jobs()
        detailed_jobs = []
        for job_summary in jobs_list:
            try:
                # Fetch detailed info for each job
                job_info = server.get_job_info(job_summary['name'])
                # Extract only the necessary fields for the frontend
                detailed_job = {
                    "name": job_info.get("name"),
                    "url": job_info.get("url"),
                    "color": job_info.get("color"),
                    # Ensure lastBuild exists and extract relevant fields
                    "lastBuild": {
                        "number": job_info.get("lastBuild", {}).get("number") if job_info.get("lastBuild") else None,
                        "url": job_info.get("lastBuild", {}).get("url") if job_info.get("lastBuild") else None,
                    } if job_info.get("lastBuild") else None # Handle jobs with no builds
                }
                detailed_jobs.append(detailed_job)
            except jenkins.JenkinsException as e:
                print(f"Error fetching details for job {job_summary.get('name', 'unknown')}: {e}")
                # Optionally skip this job or add placeholder data
                detailed_jobs.append({
                    "name": job_summary.get('name'),
                    "url": job_summary.get('url'),
                    "color": job_summary.get('color', 'grey'), # Default color if details fail
                    "lastBuild": None,
                    "error": f"Failed to fetch details: {e}"
                })

        return {"jobs": detailed_jobs}
    except jenkins.JenkinsException as e:
        print(f"Error fetching jobs list: {e}")
        return {"error": "Failed to fetch job list from Jenkins"}
    except Exception as e:
        print(f"Unexpected error in get_jobs: {e}")
        return {"error": "An unexpected server error occurred"}

@app.websocket("/ws/logs/{job_name}/{build_number}")
async def websocket_endpoint(websocket: WebSocket, job_name: str, build_number: int):
    await websocket.accept()
    print(f"DEBUG: WebSocket accepted for {job_name} #{build_number}")
    if not server:
        print("DEBUG: Jenkins server connection failed, closing WebSocket.")
        await websocket.send_json({"error": "Jenkins server connection failed"})
        await websocket.close()
        return

    try:
        print(f"DEBUG: Attempting to get logs for job '{job_name}', build #{build_number}")
        build_info = server.get_build_info(job_name, build_number)
        is_building = build_info.get('building', False)
        start_offset = 0
        print(f"DEBUG: Initial build status: is_building={is_building}")
        print(f"DEBUG: Initial build_info: {build_info}")

        while is_building:
            print(f"DEBUG: Loop start: Fetching logs, current offset={start_offset}")
            log_output = server.get_build_console_output(job_name, build_number)
            print(f"DEBUG: Fetched log_output length={len(log_output) if log_output else 0}")
            if log_output:
                 # Send only new logs
                new_log = log_output[start_offset:]
                if new_log:
                    print(f"DEBUG: Sending new_log chunk, length={len(new_log)}")
                    if websocket.client_state == WebSocketState.CONNECTED:
                        print(f"DEBUG: WebSocket state is CONNECTED, sending text.")
                        await websocket.send_text(new_log)
                    else:
                        print(f"DEBUG: WebSocket state is {websocket.client_state}, cannot send text. Breaking loop.")
                        break
                    start_offset = len(log_output)
                    print(f"DEBUG: Sent chunk, new offset={start_offset}")
                else:
                    print("DEBUG: No new logs since last check.")

            # Check if the build is still running
            print("DEBUG: Checking if build is still running...")
            build_info = server.get_build_info(job_name, build_number)
            is_building = build_info.get('building', False)
            print(f"DEBUG: Updated build status: is_building={is_building}")
            print(f"DEBUG: Updated build_info: {build_info}")
            if not is_building:
                print(f"DEBUG: Build '{job_name}' #{build_number} finished within loop.")
                # Send any remaining logs
                final_log_output = server.get_build_console_output(job_name, build_number)
                print(f"DEBUG: Fetched final log_output after build finish (in loop), length={len(final_log_output) if final_log_output else 0}")
                if final_log_output and len(final_log_output) > start_offset:
                     final_chunk = final_log_output[start_offset:]
                     print(f"DEBUG: Sending final log chunk (from loop), length={len(final_chunk)}")
                     if websocket.client_state == WebSocketState.CONNECTED:
                         print(f"DEBUG: WebSocket state is CONNECTED, sending final text (loop).")
                         await websocket.send_text(final_chunk)
                     else:
                         print(f"DEBUG: WebSocket state is {websocket.client_state}, cannot send final text (loop).")
                break
            print(f"DEBUG: Sleeping for 2 seconds...")
            await asyncio.sleep(2) # Poll every 2 seconds

        # This section runs if the build was already finished *before* the loop started,
        # or after the loop finishes.
        print(f"DEBUG: Loop finished or was skipped. is_building={is_building}, start_offset={start_offset}")
        final_log_output = server.get_build_console_output(job_name, build_number)
        print(f"DEBUG: Fetched final log_output (outside loop), length={len(final_log_output) if final_log_output else 0}")
        if final_log_output and len(final_log_output) > start_offset:
            final_chunk = final_log_output[start_offset:]
            print(f"DEBUG: Sending final log chunk (outside loop), length={len(final_chunk)}")
            if websocket.client_state == WebSocketState.CONNECTED:
                print(f"DEBUG: WebSocket state is CONNECTED, sending final text (outside loop).")
                await websocket.send_text(final_chunk)
            else:
                print(f"DEBUG: WebSocket state is {websocket.client_state}, cannot send final text (outside loop).")
        else:
            print("DEBUG: No final logs to send (outside loop).")
        print("DEBUG: Sending final status JSON: {'status': 'Build finished'}")
        if websocket.client_state == WebSocketState.CONNECTED:
            print(f"DEBUG: WebSocket state is CONNECTED, sending final JSON.")
            await websocket.send_json({"status": "Build finished"})
        else:
            print(f"DEBUG: WebSocket state is {websocket.client_state}, cannot send final JSON.")

    except jenkins.NotFoundException:
        print(f"ERROR: Build '{job_name}' #{build_number} not found.")
        await websocket.send_json({"error": f"Build '{job_name}' #{build_number} not found."})
    except jenkins.JenkinsException as e:
        print(f"ERROR: Jenkins API error: {e}")
        await websocket.send_json({"error": f"Jenkins API error: {e}"})
    except WebSocketDisconnect:
        print(f"INFO: Client disconnected from log stream for '{job_name}' #{build_number}")
    except Exception as e:
        print(f"ERROR: An unexpected error occurred: {e}")
        # It's safer to check if the websocket is still connected before sending
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json({"error": "An unexpected error occurred"})
    finally:
        print("DEBUG: Entering finally block.")
        try:
            # Ensure websocket state allows closing before attempting
            if websocket.client_state == WebSocketState.CONNECTED:
                 print("DEBUG: Closing WebSocket connection.")
                 await websocket.close()
            else:
                 print(f"DEBUG: WebSocket already closed or in invalid state ({websocket.client_state}), skipping close.")
        except RuntimeError as e:
            # Ignore errors if the connection is already closed
            if "Cannot call 'close'" not in str(e):
                 print(f"ERROR: Error closing websocket: {e}")
        print("DEBUG: Exiting websocket_endpoint.")

if __name__ == "__main__":
    import uvicorn
    # For local testing, allow easier access to Jenkins credentials if needed
    # Ensure you have JENKINS_URL, JENKINS_USERNAME, JENKINS_PASSWORD set as environment variables
    # or replace the placeholders in the script.
    print("Starting FastAPI server...")
    if not server:
        print("WARN: Jenkins connection failed. API endpoints relying on Jenkins will return errors.")
    uvicorn.run(app, host="0.0.0.0", port=8000) 