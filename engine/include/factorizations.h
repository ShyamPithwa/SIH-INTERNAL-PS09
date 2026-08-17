#pragma once
#ifndef HOUSEHOLDER_QR_H
#define HOUSEHOLDER_QR_H

#include "matrix.h"
#include <vector>

class Householder_QR {
public:
    Matrix R;
    Matrix Q;
    Householder_QR(const Matrix &A);

    const Matrix& getQ() const { return Q; }
    const Matrix& getR() const { return R; }
};

std::vector<double> back_substitution(const Matrix &R, const Matrix &b);

#endif
