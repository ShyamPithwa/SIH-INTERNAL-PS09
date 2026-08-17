#include "nla_functions.h"
#include <cmath>
#include <stdexcept>
#include <iostream>

double tnorm(const Matrix &A)
{
    if (A.getCols() != 1)
    {
        throw std::invalid_argument("tnorm() expects a column vector.");
    }
    double sum = 0.0;
    for (unsigned int i = 0; i < A.getRows(); i++)
    {
        sum += A(i, 0) * A(i, 0);
    }
    return std::sqrt(sum);
}

double tnorm(const std::vector<double> &a)
{
    double sum = 0.0;
    for (double val : a)
    {
        sum += val * val;
    }
    return std::sqrt(sum);
}

double tnorm(const Matrix &A, int k)
{
    double sum = 0.0;
    for (unsigned int i = 0; i < A.getRows(); i++)
    {
        sum += std::pow(A(i, k), 2);
    }
    return std::sqrt(sum);
}

Matrix identity(int n)
{
    Matrix I(n, n, 0.0);
    for (int i = 0; i < n; i++)
        I(i, i) = 1.0;
    return I;
}

std::vector<double> access_column(const Matrix &A, int k)
{
    unsigned int rows = A.getRows();
    std::vector<double> col(rows);
    for (unsigned int i = 0; i < rows; i++)
    {
        col[i] = A(i, k);
    }
    return col;
}

Matrix OuterProduct(const std::vector<double> &v, const Matrix &row)
{
    if (row.getRows() != 1)
    {
        throw std::invalid_argument("Second argument must be a row vector.");
    }
    Matrix result(v.size(), row.getCols(), 0.0);
    for (unsigned i = 0; i < v.size(); i++)
    {
        for (unsigned j = 0; j < row.getCols(); j++)
        {
            result(i, j) = v[i] * row(0, j);
        }
    }
    return result;
}

Matrix OuterProduct(const std::vector<double> &a, const std::vector<double> &b)
{
    Matrix result(a.size(), b.size(), 0.0);
    for (unsigned i = 0; i < a.size(); i++)
    {
        for (unsigned j = 0; j < b.size(); j++)
        {
            result(i, j) = a[i] * b[j];
        }
    }
    return result;
}

Matrix VM_multiplication(const std::vector<double> &v, const Matrix &A)
{
    if (v.size() != A.getRows())
        throw std::invalid_argument("VM_multiplication dimension mismatch.");

    Matrix result(1, A.getCols(), 0.0);
    for (unsigned int j = 0; j < A.getCols(); j++)
    {
        double sum = 0.0;
        for (unsigned int i = 0; i < A.getRows(); i++)
        {
            sum += v[i] * A(i, j);
        }
        result(0, j) = sum;
    }
    return result;
}

Matrix MV_multiplication(const Matrix &A, const std::vector<double> &v)
{
    if (v.size() != A.getCols())
        throw std::invalid_argument("MV_multiplication dimension mismatch.");

    Matrix result(A.getRows(), 1, 0.0);
    for (unsigned int i = 0; i < A.getRows(); i++)
    {
        double sum = 0.0;
        for (unsigned int j = 0; j < A.getCols(); j++)
        {
            sum += A(i, j) * v[j];
        }
        result(i, 0) = sum;
    }
    return result;
}

std::vector<double> VS_Multiplication(const std::vector<double>& v, double k)
{
    std::vector<double> result(v.size());
    for (unsigned int i = 0; i < v.size(); i++)
    {
        result[i] = v[i] * k;
    }
    return result;
}

double Dot_product(const std::vector<double>& Q, const std::vector<double>& P)
{
    if (Q.size() != P.size())
    {
        throw std::invalid_argument("Dot_product dimension mismatch.");
    }
    double r = 0;
    for (unsigned int i = 0; i < Q.size(); i++)
    {
        r += P[i] * Q[i];
    }
    return r;
}

std::vector<double> Vec_Sub(const std::vector<double>& A, const std::vector<double>& B)
{
    if (A.size() != B.size())
    {
        throw std::invalid_argument("Vec_Sub dimension mismatch.");
    }
    std::vector<double> C(A.size());
    for (unsigned int i = 0; i < A.size(); i++)
    {
        C[i] = A[i] - B[i];
    }
    return C;
}

std::vector<double> Vec_Add(const std::vector<double>& A, const std::vector<double>& B)
{
    if (A.size() != B.size())
    {
        throw std::invalid_argument("Vec_Add dimension mismatch.");
    }
    std::vector<double> C(A.size());
    for (unsigned int i = 0; i < A.size(); i++)
    {
        C[i] = A[i] + B[i];
    }
    return C;
}

void set_column(Matrix &A, int k, const std::vector<double> &col)
{
    if (col.size() != A.getRows())
    {
        throw std::invalid_argument("set_column: col size does not match matrix rows.");
    }
    for (unsigned int i = 0; i < A.getRows(); i++)
    {
        A(i, k) = col[i];
    }
}

Matrix Sub_Matrix(const Matrix &A, int i1, int i2, int j3, int j4)
{
    if (i1 < 0 || i2 >= static_cast<int>(A.getRows()) ||
        j3 < 0 || j4 >= static_cast<int>(A.getCols()) ||
        i1 > i2 || j3 > j4)
    {
        throw std::invalid_argument("Sub_Matrix: Incorrect range arguments.");
    }

    Matrix c(i2 - i1 + 1, j4 - j3 + 1, 0.0);
    for (int i = i1, r = 0; i <= i2; i++, r++)
    {
        for (int j = j3, ccol = 0; j <= j4; j++, ccol++)
        {
            c(r, ccol) = A(i, j);
        }
    }
    return c;
}

void InsertSubMatrix(Matrix &A, const Matrix &sub, unsigned startRow, unsigned startCol)
{
    if (startRow + sub.getRows() > A.getRows() ||
        startCol + sub.getCols() > A.getCols())
    {
        throw std::invalid_argument("InsertSubMatrix: Submatrix exceeds target dimensions.");
    }

    for (unsigned i = 0; i < sub.getRows(); i++)
    {
        for (unsigned j = 0; j < sub.getCols(); j++)
        {
            A(startRow + i, startCol + j) = sub(i, j);
        }
    }
}

Matrix vandermonde(const std::vector<double> &x, int degree)
{
    Matrix V(x.size(), degree + 1, 0.0);
    for (unsigned int i = 0; i < x.size(); i++)
    {
        double value = 1.0;
        for (int j = 0; j <= degree; j++)
        {
            V(i, j) = value;
            value *= x[i];
        }
    }
    return V;
}

Matrix vectorToMatrix(const std::vector<double> &v)
{
    Matrix M(v.size(), 1, 0.0);
    for (unsigned int i = 0; i < v.size(); i++)
    {
        M(i, 0) = v[i];
    }
    return M;
}
