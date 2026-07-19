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
#include "Logger.hpp"
#include <chrono>
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <cmath>

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
    logMessage("info", "Configured: stepSize=" + std::to_string(stepSize_) + " solver=" + solver_);
}

void SimulationEngine::setStepSize(double stepSize) {
    if (stepSize <= 0.0) {
        logMessage("warning", "Ignoring invalid step size: " + std::to_string(stepSize));
        return;
    }
    std::lock_guard<std::mutex> lock(configMutex_);
    stepSize_ = stepSize;
    logMessage("info", "Step size updated to " + std::to_string(stepSize_));
}

void SimulationEngine::setSolver(const std::string& solver) {
    if (solver.empty()) return;
    std::lock_guard<std::mutex> lock(configMutex_);
    solver_ = solver;
    logMessage("info", "Solver updated to " + solver_);
}

void SimulationEngine::setStopTime(double stopTime) {
    std::lock_guard<std::mutex> lock(configMutex_);
    stopTime_ = (stopTime >= 0.0) ? stopTime : 0.0;
    logMessage("info", "Stop time set to " + std::to_string(stopTime_) + " seconds");
}

void SimulationEngine::setSpeed(double multiplier) {
    std::lock_guard<std::mutex> lock(configMutex_);
    if (multiplier < 0.0) multiplier = 1.0;
    speed_ = multiplier;
    logMessage("info", "Simulation speed set to " + std::to_string(speed_) + "x");
}

void SimulationEngine::updateBlockParam(const std::string& blockId, double amp, double freq) {
    std::lock_guard<std::mutex> lock(configMutex_);
    if (blockId == "sine") {
        sineAmplitude_ = amp;
        sineFrequency_ = freq;
        logMessage("info", "Sine block updated: Amplitude=" + std::to_string(amp) + " Frequency=" + std::to_string(freq));
    } else if (blockId == "cosine") {
        cosineAmplitude_ = amp;
        cosineFrequency_ = freq;
        logMessage("info", "Cosine block updated: Amplitude=" + std::to_string(amp) + " Frequency=" + std::to_string(freq));
    }
}

void SimulationEngine::reset(SampleCallback cb) {
    bool wasRunning = running_.load();
    if (wasRunning) {
        stop();
    }
    logMessage("info", "Simulation reset");
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
        logMessage("info", "Simulation started. Logging to simulation_run.csv");

        std::ofstream csvFile("simulation_run.csv");
        if (csvFile.is_open()) {
            csvFile << "t,sin,cos\n";
        } else {
            logMessage("warning", "Could not open simulation_run.csv for writing");
        }

        bool sineNanLogged = false;
        bool cosineNanLogged = false;

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
                logMessage("info", "Stop time reached (" + std::to_string(currentStopTime) + "s). Halting.");
                running_ = false;
                break;
            }

            // Evaluate the block graph at current time with dynamic parameters
            double sinV = sinAmp * std::sin(sinFreq * t);
            double cosV = cosAmp * std::cos(cosFreq * t);

            // Numerical checks for NaN (Simulink style)
            if (std::isnan(sinV)) {
                if (!sineNanLogged) {
                    logMessage("warning", "Sine block output: NaN detected", "sine");
                    sineNanLogged = true;
                }
            } else {
                sineNanLogged = false;
            }

            if (std::isnan(cosV)) {
                if (!cosineNanLogged) {
                    logMessage("warning", "Cosine block output: NaN detected", "cosine");
                    cosineNanLogged = true;
                }
            } else {
                cosineNanLogged = false;
            }

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
            logMessage("info", "Saved all run samples to simulation_run.csv");
        }

        logMessage("info", "Simulation stopped.");
    });
}

void SimulationEngine::stop() {
    running_ = false;
    if (loopThread_.joinable()) {
        loopThread_.join();
    }
}
