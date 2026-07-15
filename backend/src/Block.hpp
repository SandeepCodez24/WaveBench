#pragma once
#include <cmath>

// ============================================================================
// Block.hpp — Abstract base class and concrete block implementations
// for the WaveBench Studio simulation engine.
//
// Architecture:
//   Block (abstract)  ←  ClockBlock   (signal generator:  compute(t) = t)
//                     ←  SineBlock    (function processor: compute(t) = sin(source))
//                     ←  CosineBlock  (function processor: compute(t) = cos(source))
//
// All blocks share a unified `compute(t)` interface so the engine can
// evaluate the entire block graph polymorphically.
// ============================================================================

// Abstract base class — all simulation blocks implement compute(t)
class Block {
public:
    virtual double compute(double time) = 0;
    virtual ~Block() = default;

    // Blocks are graph nodes with pointer-based wiring — copying/moving
    // would break the source pointer relationships.
    Block() = default;
    Block(const Block&) = delete;
    Block& operator=(const Block&) = delete;
    Block(Block&&) = delete;
    Block& operator=(Block&&) = delete;
};

// Clock: master time reference — simply passes through the time value.
// This is the root of the block graph; it has no upstream source.
class ClockBlock : public Block {
public:
    double compute(double time) override { return time; }
};

// Sine: applies sin() to the upstream block's output.
// Wiring: Clock → Sine
class SineBlock : public Block {
    Block* source_;
public:
    explicit SineBlock(Block* src) : source_(src) {}
    double compute(double time) override {
        return std::sin(source_->compute(time));
    }
};

// Cosine: applies cos() to the upstream block's output.
// Wiring: Clock → Cosine
class CosineBlock : public Block {
    Block* source_;
public:
    explicit CosineBlock(Block* src) : source_(src) {}
    double compute(double time) override {
        return std::cos(source_->compute(time));
    }
};
