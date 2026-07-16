// ============================================================================
// SimulationEngine.cpp — Fixed-step simulation loop implementation.
//
// The engine constructs the block graph:
//   ClockBlock → SineBlock
//   ClockBlock → CosineBlock
//
// Each iteration:
//   1. Read the current stepSize, solver, speed, and stopTime under lock
//   2. Evaluate sine.compute(t) and cosine.compute(t)
//   3. Push the sample via the callback
//   4. Advance time by stepSize
//   5. Sleep for (stepSize / speed) * 1000 ms
//
// The solver_ field distinguishes RK4 vs Euler. Currently both produce the
// same result for stateless sin/cos blocks, but the infrastructure is in
// place for future stateful blocks (e.g., integrators).
// ============================================================================

#include "SimulationEngine.hpp"
#include "Block.hpp"
#include <chrono>
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>

SimulationEngine::SimulationEngine() = default;

SimulationEngine::~SimulationEngine() {
    stop();
}

void SimulationEngine::configure(double stepSize, const std::string& solver) {
    std::lock_guard<std::mutex> lock(configMutex_);
    if (stepSize > 0.0) {
        stepSize_ = stepSize;
    }
    if (!solver.empty()) {
        solver_ = solver;
    }
    std::cout << "[C++] Configured: stepSize=" << stepSize_
              << " solver=" << solver_ << "\n";
}

void SimulationEngine::setStepSize(double stepSize) {
    if (stepSize <= 0.0) {
        std::cerr << "[C++] Ignoring invalid step size: " << stepSize << "\n";
        return;
    }
    std::lock_guard<std::mutex> lock(configMutex_);
    stepSize_ = stepSize;
    std::cout << "[C++] Step size updated to " << stepSize_ << "\n";
}

void SimulationEngine::setSolver(const std::string& solver) {
    if (solver.empty()) return;
    std::lock_guard<std::mutex> lock(configMutex_);
    solver_ = solver;
    std::cout << "[C++] Solver updated to " << solver_ << "\n";
}

void SimulationEngine::setStopTime(double stopTime) {
    std::lock_guard<std::mutex> lock(configMutex_);
    stopTime_ = (stopTime >= 0.0) ? stopTime : 0.0;
    std::cout << "[C++] Stop time set to " << stopTime_ << " seconds\n";
}

void SimulationEngine::setSpeed(double multiplier) {
    std::lock_guard<std::mutex> lock(configMutex_);
    // 0 means MAX (no sleep). Otherwise clamp to sensible range.
    if (multiplier < 0.0) multiplier = 1.0;
    speed_ = multiplier;
    std::cout << "[C++] Simulation speed set to " << speed_ << "x\n";
}

void SimulationEngine::updateBlockParam(const std::string& blockId, double amp, double freq) {
    std::lock_guard<std::mutex> lock(configMutex_);
    if (blockId == "sine") {
        sineAmplitude_ = amp;
        sineFrequency_ = freq;
        std::cout << "[C++] Sine block updated: Amplitude=" << amp << " Frequency=" << freq << "\n";
    } else if (blockId == "cosine") {
        cosineAmplitude_ = amp;
        cosineFrequency_ = freq;
        std::cout << "[C++] Cosine block updated: Amplitude=" << amp << " Frequency=" << freq << "\n";
    }
}

void SimulationEngine::reset(SampleCallback cb) {
    // If running, stop the loop first, then notify the frontend
    bool wasRunning = running_.load();
    if (wasRunning) {
        stop();
    }
    std::cout << "[C++] Simulation reset.\n";
    // Notify browser via the callback with a sentinel t=-1 value
    if (cb) {
        cb(-1.0, 0.0, 0.0); // frontend interprets t<0 as reset_ack
    }
    if (wasRunning) {
        start(cb);
    }
}

std::string SimulationEngine::getStatus() const {
    std::lock_guard<std::mutex> lock(configMutex_);
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(6);
    ss << "{\"type\":\"status\""
       << ",\"running\":" << (running_.load() ? "true" : "false")
       << ",\"stepSize\":" << stepSize_
       << ",\"solver\":\"" << solver_ << "\""
       << ",\"speed\":" << speed_
       << ",\"stopTime\":" << stopTime_ << "}";
    return ss.str();
}

void SimulationEngine::start(SampleCallback cb) {
    // If already running, stop the old loop first then restart
    if (running_.exchange(true)) {
        stop();
        running_ = true;
    }

    loopThread_ = std::thread([this, cb]() {
        // Construct the block graph on the simulation thread
        ClockBlock  clock;
        SineBlock   sine(&clock);
        CosineBlock cosine(&clock);

        double t = 0.0;
        std::cout << "[C++] Simulation started. Logging to simulation_run.csv\n";

        std::ofstream csvFile("simulation_run.csv");
        if (csvFile.is_open()) {
            csvFile << "t,sin,cos\n";
        } else {
            std::cerr << "[C++] Warning: Could not open simulation_run.csv for writing.\n";
        }

        while (running_) {
            // Read current config and parameters under lock
            double currentStep, currentSpeed, currentStopTime;
            double sinAmp, sinFreq, cosAmp, cosFreq;
            {
                std::lock_guard<std::mutex> lock(configMutex_);
                currentStep     = stepSize_;
                currentSpeed    = speed_;
                currentStopTime = stopTime_;
                sinAmp  = sineAmplitude_;
                sinFreq = sineFrequency_;
                cosAmp  = cosineAmplitude_;
                cosFreq = cosineFrequency_;
            }

            // Auto-halt when stop time is reached (0 = run forever)
            if (currentStopTime > 0.0 && t >= currentStopTime) {
                std::cout << "[C++] Stop time reached (" << currentStopTime << "s). Halting.\n";
                running_ = false;
                break;
            }

            // Evaluate the block graph at current time with dynamic parameters
            double sinV = sinAmp * std::sin(sinFreq * t);
            double cosV = cosAmp * std::cos(cosFreq * t);

            // Push sample to the callback (which sends it over TCP)
            cb(t, sinV, cosV);

            // Write to local CSV log
            if (csvFile.is_open()) {
                csvFile << t << "," << sinV << "," << cosV << "\n";
            }

            // Advance simulation time
            t += currentStep;

            // Real-time pacing: sleep = stepSize / speed (0 speed = no sleep = MAX)
            if (currentSpeed > 0.0) {
                int sleepMs = static_cast<int>((currentStep / currentSpeed) * 1000.0);
                if (sleepMs < 1)    sleepMs = 1;
                if (sleepMs > 1000) sleepMs = 1000;
                std::this_thread::sleep_for(std::chrono::milliseconds(sleepMs));
            }
        }

        if (csvFile.is_open()) {
            csvFile.close();
            std::cout << "[C++] Saved all run samples to simulation_run.csv\n";
        }

        std::cout << "[C++] Simulation stopped.\n";
    });
}

void SimulationEngine::stop() {
    running_ = false;
    if (loopThread_.joinable()) {
        loopThread_.join();
    }
}
