// ============================================================================
// SimulationEngine.cpp — Fixed-step simulation loop implementation.
//
// The engine constructs the block graph:
//   ClockBlock → SineBlock
//   ClockBlock → CosineBlock
//
// Each iteration:
//   1. Read the current stepSize and solver under lock
//   2. Evaluate sine.compute(t) and cosine.compute(t)
//   3. Push the sample via the callback
//   4. Advance time by stepSize
//   5. Sleep for stepSize * 1000 ms (real-time pacing)
//
// The solver_ field is reserved for future RK4 vs Euler differentiation.
// Currently both paths produce the same result since sin/cos are stateless
// functions — but the infrastructure is in place for when blocks become
// stateful (e.g., integrators).
// ============================================================================

#include "SimulationEngine.hpp"
#include <chrono>
#include <iostream>

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
        std::cout << "[C++] Simulation started.\n";

        while (running_) {
            // Evaluate the block graph at current time
            double sinV = sine.compute(t);
            double cosV = cosine.compute(t);

            // Push sample to the callback (which sends it over TCP)
            cb(t, sinV, cosV);

            // Read current config under lock
            double currentStep;
            {
                std::lock_guard<std::mutex> lock(configMutex_);
                currentStep = stepSize_;
            }

            // Advance simulation time
            t += currentStep;

            // Real-time pacing: sleep for the duration of one step
            // Clamp the sleep to a reasonable range to avoid freezing
            int sleepMs = static_cast<int>(currentStep * 1000.0);
            if (sleepMs < 1)   sleepMs = 1;
            if (sleepMs > 1000) sleepMs = 1000;
            std::this_thread::sleep_for(std::chrono::milliseconds(sleepMs));
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
