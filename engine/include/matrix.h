#pragma once
#ifndef __EE_242_Project_2__matrix__
#define __EE_242_Project_2__matrix__

#include <iostream>
#include <vector>
#include <cmath>

class Matrix {
private:
    unsigned m_rowSize;
    unsigned m_colSize;
    std::vector<std::vector<double>> m_matrix;

public:
    Matrix(unsigned rowSize, unsigned colSize, double initial = 0.0);
    Matrix(const Matrix &other);
    ~Matrix();

    // Matrix Operations
    Matrix operator+(Matrix &other);
    Matrix operator-(const Matrix &other) const;
    Matrix operator*(Matrix &other);
    Matrix transpose() const;

    // Scalar Operations
    Matrix operator+(double scalar);
    Matrix operator-(double scalar);
    Matrix operator*(double scalar);
    Matrix operator/(double scalar);

    // Accessors
    double &operator()(const unsigned &rowNo, const unsigned &colNo);
    const double &operator()(const unsigned &rowNo, const unsigned &colNo) const;

    void print() const;
    Matrix clean(double eps = 1e-12) const;
    void prettyPrint(int precision = 6, double eps = 1e-12) const;

    unsigned getRows() const;
    unsigned getCols() const;
};
#endif
