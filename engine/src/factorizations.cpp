#include "factorizations.h"
#include "nla_functions.h"
#include <cmath>
#include <stdexcept>
#include <algorithm>

Householder_QR::Householder_QR(const Matrix &A)
    : R(A), Q(identity(A.getRows()))
{
    int n = A.getCols();
    int m = A.getRows();

    for (int i = 0; i < std::min(m - 1, n); i++)
    {
        Matrix H = identity(m);
        Matrix A_sub = Sub_Matrix(R, i, m - 1, i, n - 1);

        std::vector<double> x = access_column(A_sub, 0);
        std::vector<double> e(x.size(), 0.0);
        e[0] = 1.0;

        double y = tnorm(x);
        double z = (x[0] >= 0) ? 1.0 : -1.0;

        std::vector<double> v = VS_Multiplication(e, y * z);
        v = Vec_Add(v, x);

        double v1 = tnorm(v);
        if (v1 == 0.0)
            continue;

        v = VS_Multiplication(v, 1.0 / v1);
        Matrix H_small = identity(v.size());
        H_small = H_small - (OuterProduct(v, v) * 2.0);

        Matrix temp = VM_multiplication(v, A_sub);
        Matrix update = OuterProduct(v, temp) * 2.0;
        InsertSubMatrix(H, H_small, i, i);
        Q = Q * H;
        A_sub = A_sub - update;
        InsertSubMatrix(R, A_sub, i, i);
    }
}

std::vector<double> back_substitution(const Matrix &R, const Matrix &b)
{
    int n = R.getCols();
    std::vector<double> x(n, 0.0);

    for (int i = n - 1; i >= 0; i--)
    {
        double sum = 0.0;
        for (int j = i + 1; j < n; j++)
        {
            sum += R(i, j) * x[j];
        }

        if (std::abs(R(i, i)) < 1e-12)
        {
            throw std::runtime_error("Back substitution failed: zero diagonal element.");
        }

        x[i] = (b(i, 0) - sum) / R(i, i);
    }

    return x;
}
