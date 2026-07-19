#pragma once
#include <string>
#include <iostream>
#include <sstream>

inline void logMessage(const std::string& level, const std::string& msg, const std::string& blockId = "") {
    std::ostringstream ss;
    ss << "{\"level\":\"" << level << "\",\"src\":\"engine\",\"msg\":\"" << msg << "\"";
    if (!blockId.empty()) {
        ss << ",\"blockId\":\"" << blockId << "\"";
    }
    ss << "}\n";
    std::cerr << ss.str() << std::flush;
}
