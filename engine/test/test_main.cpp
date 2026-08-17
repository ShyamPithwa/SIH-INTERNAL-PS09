#include "matrix.h"
#include "nla_functions.h"
#include "factorizations.h"
#include "polynomial_regression.h"
#include <iostream>
#include <cassert>
#include <cmath>
#include <vector>

void test_matrix_basic() {
    std::cout << "Running test_matrix_basic..." << std::endl;
    Matrix A(2, 3, 4.0);
    assert(A.getRows() == 2);
    assert(A.getCols() == 3);
    assert(A(0, 0) == 4.0);
    
    A(1, 2) = 8.5;
    assert(A(1, 2) == 8.5);
    
    Matrix B = A.transpose();
    assert(B.getRows() == 3);
    assert(B.getCols() == 2);
    assert(B(2, 1) == 8.5);
    
    std::cout << "test_matrix_basic passed!" << std::endl;
}

void test_matrix_operations() {
    std::cout << "Running test_matrix_operations..." << std::endl;
    Matrix A(2, 2, 0.0);
    A(0, 0) = 1; A(0, 1) = 2;
    A(1, 0) = 3; A(1, 1) = 4;
    
    Matrix B(2, 2, 0.0);
    B(0, 0) = 5; B(0, 1) = 6;
    B(1, 0) = 7; B(1, 1) = 8;
    
    Matrix C = A + B;
    assert(C(0, 0) == 6);
    assert(C(1, 1) == 12);
    
    Matrix D = A * B;
    // [1 2] * [5 6] = [19 22]
    // [3 4]   [7 8]   [43 50]
    assert(D(0, 0) == 19);
    assert(D(0, 1) == 22);
    assert(D(1, 0) == 43);
    assert(D(1, 1) == 50);
    
    std::cout << "test_matrix_operations passed!" << std::endl;
}

void test_qr_factorization() {
    std::cout << "Running test_qr_factorization..." << std::endl;
    Matrix A(3, 2, 0.0);
    A(0, 0) = 12; A(0, 1) = -51;
    A(1, 0) = 6;  A(1, 1) = 167;
    A(2, 0) = -4; A(2, 1) = 24;
    
    Householder_QR qr(A);
    Matrix Q = qr.getQ();
    Matrix R = qr.getR();
    
    // Test A ≈ Q * R
    Matrix QR = Q * R;
    for (unsigned i = 0; i < A.getRows(); i++) {
        for (unsigned j = 0; j < A.getCols(); j++) {
            assert(std::abs(A(i, j) - QR(i, j)) < 1e-9);
        }
    }
    
    // Test Q^T * Q ≈ I
    Matrix Qt = Q.transpose();
    Matrix QtQ = Qt * Q;
    for (unsigned i = 0; i < Q.getCols(); i++) {
        for (unsigned j = 0; j < Q.getCols(); j++) {
            double expected = (i == j) ? 1.0 : 0.0;
            assert(std::abs(QtQ(i, j) - expected) < 1e-9);
        }
    }
    
    std::cout << "test_qr_factorization passed!" << std::endl;
}

void test_polynomial_fitting() {
    std::cout << "Running test_polynomial_fitting..." << std::endl;
    // y = 1 + 2x + 3x^2
    std::vector<double> x = { 0, 1, 2, 3, 4 };
    std::vector<double> y(x.size());
    for (size_t i = 0; i < x.size(); ++i) {
        y[i] = 1.0 + 2.0 * x[i] + 3.0 * x[i] * x[i];
    }
    
    PolynomialFitResult result = fitPolynomialLeastSquares(x, y, 3, 1e-6);
    
    assert(result.degree == 2 || result.degree == 3);
    assert(result.residualNorm < 1e-6);
    
    // Check coefficients
    // c0 ≈ 1, c1 ≈ 2, c2 ≈ 3
    assert(std::abs(result.coefficients[0] - 1.0) < 1e-6);
    assert(std::abs(result.coefficients[1] - 2.0) < 1e-6);
    assert(std::abs(result.coefficients[2] - 3.0) < 1e-6);
    
    // Check evaluate
    double val = evaluatePolynomial(result.coefficients, 5.0);
    double expected = 1.0 + 2.0 * 5.0 + 3.0 * 5.0 * 5.0; // 86
    assert(std::abs(val - expected) < 1e-6);
    
    std::cout << "test_polynomial_fitting passed!" << std::endl;
}

int main() {
    std::cout << "==============================" << std::endl;
    std::cout << "  Starting Engine Unit Tests  " << std::endl;
    std::cout << "==============================" << std::endl;
    
    try {
        test_matrix_basic();
        test_matrix_operations();
        test_qr_factorization();
        test_polynomial_fitting();
        
        std::cout << "==============================" << std::endl;
        std::cout << "  ALL ENGINE TESTS PASSED!!   " << std::endl;
        std::cout << "==============================" << std::endl;
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Test failed with exception: " << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "Test failed with unknown exception!" << std::endl;
        return 1;
    }
}
