#pragma once
#ifndef JSON_IO_H
#define JSON_IO_H

#include "domain.h"
#include <string>

EngineInput parseInputJson(const std::string& jsonStr);
std::string serializeOutputJson(const EngineOutput& output);

#endif
