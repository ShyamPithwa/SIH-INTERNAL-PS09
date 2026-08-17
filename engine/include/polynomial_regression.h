#pragma once
#ifndef POLYNOMIAL_REGRESSION_H
#define POLYNOMIAL_REGRESSION_H

#include <vector>

struct PolynomialFitResult {
    int degree;
    std::vector<double> coefficients;
    double residualNorm;
};

PolynomialFitResult fitPolynomialLeastSquares(
    const std::vector<double>& x,
    const std::vector<double>& y,
    int maxDegree,
    double tolerance
);

double evaluatePolynomial(
    const std::vector<double>& coefficients,
    double x
);

#endif
