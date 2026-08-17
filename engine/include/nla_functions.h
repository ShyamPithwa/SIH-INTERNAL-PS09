#pragma once
#ifndef NLA_FUNCTIONS_H
#define NLA_FUNCTIONS_H

#include "matrix.h"
#include <vector>

Matrix vandermonde(const std::vector<double>& x, int degree);
Matrix identity(int n);
Matrix vectorToMatrix(const std::vector<double> &v);
Matrix Sub_Matrix(const Matrix &A, int i1, int i2, int j3, int j4);
void InsertSubMatrix(Matrix& A, const Matrix& sub, unsigned startRow, unsigned startCol);

double tnorm(const Matrix& M);
double tnorm(const std::vector<double>& a);
double tnorm(const Matrix &A, int k);

std::vector<double> access_column(const Matrix &A, int k);
void set_column(Matrix &A, int k, const std::vector<double>& col);

Matrix MV_multiplication(const Matrix &A, const std::vector<double> &v);
std::vector<double> VS_Multiplication(const std::vector<double>& v, double k);
double Dot_product(const std::vector<double>& Q, const std::vector<double>& P);
Matrix VM_multiplication(const std::vector<double>& v, const Matrix& A);
Matrix OuterProduct(const std::vector<double>& v, const Matrix& row);
Matrix OuterProduct(const std::vector<double> &a, const std::vector<double> &b);

std::vector<double> Vec_Sub(const std::vector<double>& A, const std::vector<double>& B);
std::vector<double> Vec_Add(const std::vector<double>& A, const std::vector<double>& B);

#endif
