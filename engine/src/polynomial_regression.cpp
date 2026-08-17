#include "polynomial_regression.h"
#include "matrix.h"
#include "nla_functions.h"
#include "factorizations.h"
#include <limits>
#include <cmath>
#include <stdexcept>

PolynomialFitResult fitPolynomialLeastSquares(
    const std::vector<double>& x,
    const std::vector<double>& y,
    int maxDegree,
    double tolerance
) {
    if (x.empty() || y.empty() || x.size() != y.size()) {
        throw std::invalid_argument("Invalid inputs: x and y must be non-empty and of equal size.");
    }
    
    double bestResidual = std::numeric_limits<double>::max();
    int bestDegree = 1;
    std::vector<double> bestCoeff;
    
    Matrix u = vectorToMatrix(y);
    
    int limitDegree = std::min(maxDegree, static_cast<int>(x.size()) - 1);
    if (limitDegree < 1) limitDegree = 1;
    
    double previousResidual = std::numeric_limits<double>::max();
    
    for (int degree = 1; degree <= limitDegree; ++degree) {
        Matrix A = vandermonde(x, degree);
        Householder_QR qr(A);
        int k = degree + 1;
        
        Matrix R1 = Sub_Matrix(qr.R, 0, k - 1, 0, k - 1);
        Matrix Qt = qr.Q.transpose();
        Matrix b = Qt * u;
        Matrix rhs = Sub_Matrix(b, 0, k - 1, 0, 0);
        
        std::vector<double> c;
        try {
            c = back_substitution(R1, rhs);
        } catch (...) {
            continue; 
        }
        
        Matrix z = MV_multiplication(A, c) - u;
        
        double normRhs = tnorm(rhs);
        double r = 0;
        if (normRhs > 1e-12) {
            r = tnorm(z) / normRhs;
        } else {
            r = tnorm(z);
        }
        
        if (std::isnan(r) || std::isinf(r)) {
            continue;
        }
        
        if (r < bestResidual) {
            bestResidual = r;
            bestDegree = degree;
            bestCoeff = c;
        }
        
        if (r < tolerance) {
            break;
        }
        
        if (std::abs(r - previousResidual) < 1e-8) {
            break;
        }
        previousResidual = r;
    }
    
    if (bestCoeff.empty()) {
        double sum = 0;
        for (double val : y) sum += val;
        bestCoeff = { sum / y.size() };
        bestDegree = 0;
        bestResidual = 0;
    }
    
    return { bestDegree, bestCoeff, bestResidual };
}

double evaluatePolynomial(const std::vector<double>& coefficients, double x) {
    double result = 0.0;
    double x_pow = 1.0;
    for (double coeff : coefficients) {
        result += coeff * x_pow;
        x_pow *= x;
    }
    return result;
}
