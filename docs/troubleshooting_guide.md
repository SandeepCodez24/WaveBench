# WaveBench Studio — Running & Troubleshooting Guide

This guide details the standard startup instructions for WaveBench Studio's three-tier architecture and documents the compilation/runtime issues encountered on Windows and their resolutions.

---

## 1. System Architecture
WaveBench Studio is composed of three interconnected parts that must be started in order:
1. **C++ Simulation Engine (Backend)**: Binds to and listens on TCP port `5050`.
2. **Java Gateway**: Connects to the C++ engine over TCP on `5050` and hosts a WebSocket server on port `8080`.
3. **React Frontend (Vite)**: Runs the web client interface and connects to the Java Gateway over WebSocket.

---

## 2. Standard Startup Guide

### Step 1: C++ Simulation Backend
Open a terminal and navigate to the `backend` directory:
```cmd
cd backend
```
1. **Compile with static linking (to bundle DLLs):**
   ```cmd
   C:\Users\sande\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin\g++.exe -std=c++17 -O2 src\*.cpp -static -lws2_32 -o build\wavebench_engine.exe
   ```
2. **Run the executable:**
   ```cmd
   build\wavebench_engine.exe
   ```
   *Note: Leave this terminal open. It should display:*
   ```text
   [C++] WaveBench Studio Engine v1.0
   [C++] Listening on TCP port 5050...
   [C++] Waiting for Java gateway connection...
   ```

### Step 2: Java WebSocket Gateway
Open a second terminal and navigate to the `gateway` directory:
```cmd
cd gateway
```
1. **Start the gateway:**
   ```cmd
   mvn exec:java
   ```
   *Note: This connects to the C++ engine at `localhost:5050` and opens a WebSocket on port `8080`.*

### Step 3: React Frontend
Open a third terminal and navigate to the `frontend` directory:
```cmd
cd frontend
```
1. **Install dependencies (first time only):**
   ```cmd
   npm install
   ```
2. **Start the development server:**
   ```cmd
   npm run dev
   ```
3. Open your browser and navigate to the URL printed in the console (typically `http://localhost:5173`).

---

## 3. Issues Faced & Resolutions

### Issue 1: Compiler lacks C++ standard threading classes
* **Symptoms:**
  ```text
  error: 'thread' in namespace 'std' does not name a type
  error: 'mutex' in namespace 'std' does not name a type
  error: 'std::this_thread' has not been declared
  ```
* **Root Cause:**
  The default `g++` command on the system path pointed to `C:\MinGW\bin\g++.exe`. This is a legacy MinGW build that uses the `win32` thread model, which does not support C++ standard library concurrency primitives like `<thread>` or `<mutex>`.
* **Resolution:**
  Use the modern WinLibs GCC toolchain already installed in the AppData winget packages directory, which is compiled with the `posix` thread model and supports C++17 threading.
  * **Compile Command:**
    ```cmd
    C:\Users\sande\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin\g++.exe -std=c++17 -O2 src\*.cpp -static -lws2_32 -o build\wavebench_engine.exe
    ```

---

### Issue 2: C++ Backend exits immediately without output
* **Symptoms:**
  Running `build\wavebench_engine.exe` returned to the command prompt instantly without printing any logs.
* **Root Cause:**
  The compiler dynamically links runtime libraries (e.g. `libstdc++-6.dll`, `libwinpthread-1.dll`). Since the directory containing these DLLs was not on the system's `PATH`, Windows failed to load them and silently aborted execution.
* **Resolution:**
  Pass the `-static` flag during compilation to embed these runtimes directly into the binary, making it fully standalone.
  * **Updated Compile Flag:** Add `-static` to the compiler flags.

---

### Issue 3: Command Prompt path syntax error
* **Symptoms:**
  Running `./build/wavebench_engine.exe` resulted in:
  ```text
  '.' is not recognized as an internal or external command, operable program or batch file.
  ```
* **Root Cause:**
  Windows Command Prompt (`cmd.exe`) uses backslashes (`\`) for file system paths and does not recognize `./` prefixes for local execution (unlike PowerShell or Unix shells).
* **Resolution:**
  Run the executable using standard Windows path separator syntax:
  ```cmd
  build\wavebench_engine.exe
  ```

---

### Issue 4: Java Gateway fails to connect to engine
* **Symptoms:**
  ```text
  [Gateway] Connecting to C++ engine at localhost:5050...
  [Gateway] Could not connect to C++ engine at localhost:5050 after 15 attempts.
  [ERROR] Failed to execute goal org.codehaus.mojo:exec-maven-plugin:3.1.0:java
  ```
* **Root Cause:**
  The Java gateway was started while the C++ Simulation Engine was not running or listening.
* **Resolution:**
  Always ensure that the C++ simulation backend is running and listening on port `5050` before starting the Java gateway.
