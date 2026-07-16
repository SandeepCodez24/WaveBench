#pragma once
// ============================================================================
// SimulationEngine.hpp — Controls the fixed-step simulation loop.
//
// The engine owns the block graph (Clock → Sine, Clock → Cosine) and runs
// the solver loop on a dedicated thread, pushing {t, sin, cos} samples
// to a callback at each time step.
//
// Thread safety:
//   - `running_` is std::atomic — safe to read/write from any thread.
//   - `configMutex_` guards all mutable config fields so they can be
//     changed while the simulation is running (hot-reconfiguration).
// ============================================================================

#include <functional>
#include <atomic>
#include <thread>
#include <string>
#include <mutex>

class SimulationEngine {
public:
    // Callback signature: (time, sinValue, cosValue)
    using SampleCallback = std::function<void(double t, double sinV, double cosV)>;

    SimulationEngine();
    ~SimulationEngine();

    // Set step size and solver type before or during a simulation run
    void configure(double stepSize, const std::string& solver);

    // Hot-update just the step size while the simulation is running
    void setStepSize(double stepSize);

    // Set solver type while the simulation is running
    void setSolver(const std::string& solver);

    // Update block parameters (Amplitude, Frequency) while the simulation is running
    void updateBlockParam(const std::string& blockId, double amp, double freq);

    // Reset simulation: zero time, clear state. Sends reset_ack via callback.
    void reset(SampleCallback cb);

    // Set the simulation stop time (seconds). 0.0 = run forever.
    void setStopTime(double stopTime);

    // Set simulation speed multiplier (0.25, 1.0, 4.0, or 0 for MAX)
    void setSpeed(double multiplier);

    // Return a JSON string with current engine status
    std::string getStatus() const;

    // Start the simulation loop on a background thread.
    // If already running, stops the current loop first, then restarts.
    void start(SampleCallback cb);

    // Stop the simulation loop and join the background thread.
    void stop();

    // Query current state
    bool isRunning() const { return running_.load(); }

private:
    double      stepSize_  = 0.02;
    std::string solver_    = "RK4";
    double      stopTime_  = 0.0;   // 0 = run forever
    double      speed_     = 1.0;   // wall-clock multiplier

    std::atomic<bool> running_{false};
    std::thread       loopThread_;
    mutable std::mutex        configMutex_;   // mutable: locked in const getStatus()

    // Thread-safe parameters for block computation
    double sineAmplitude_   = 1.0;
    double sineFrequency_   = 1.0;
    double cosineAmplitude_ = 1.0;
    double cosineFrequency_ = 1.0;
};
