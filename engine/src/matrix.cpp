#include "matrix.h"
#include <iomanip>
#include <stdexcept>

Matrix::Matrix(unsigned rowSize, unsigned colSize, double initial)
    : m_rowSize(rowSize), m_colSize(colSize)
{
    m_matrix.resize(rowSize);
    for (unsigned i = 0; i < m_matrix.size(); i++)
    {
        m_matrix[i].resize(colSize, initial);
    }
}

Matrix::Matrix(const Matrix &other)
    : m_rowSize(other.m_rowSize), m_colSize(other.m_colSize), m_matrix(other.m_matrix)
{
}

Matrix::~Matrix()
{
}

Matrix Matrix::operator+(Matrix &other)
{
    if (m_rowSize != other.getRows() || m_colSize != other.getCols()) {
        throw std::invalid_argument("Matrix addition size mismatch");
    }
    Matrix sum(m_rowSize, m_colSize, 0.0);
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < m_colSize; j++)
        {
            sum(i, j) = this->m_matrix[i][j] + other(i, j);
        }
    }
    return sum;
}

Matrix Matrix::operator-(const Matrix &other) const
{
    if (m_rowSize != other.getRows() || m_colSize != other.getCols()) {
        throw std::invalid_argument("Matrix subtraction size mismatch");
    }
    Matrix diff(m_rowSize, m_colSize, 0.0);
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < m_colSize; j++)
        {
            diff(i, j) = (*this)(i, j) - other(i, j);
        }
    }
    return diff;
}

Matrix Matrix::operator*(Matrix &other)
{
    if (m_colSize != other.getRows())
    {
        throw std::invalid_argument("Matrix multiplication dimension mismatch");
    }
    Matrix multip(m_rowSize, other.getCols(), 0.0);
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < other.getCols(); j++)
        {
            double temp = 0.0;
            for (unsigned k = 0; k < m_colSize; k++)
            {
                temp += m_matrix[i][k] * other(k, j);
            }
            multip(i, j) = temp;
        }
    }
    return multip;
}

Matrix Matrix::operator+(double scalar)
{
    Matrix result(m_rowSize, m_colSize, 0.0);
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < m_colSize; j++)
        {
            result(i, j) = this->m_matrix[i][j] + scalar;
        }
    }
    return result;
}

Matrix Matrix::operator-(double scalar)
{
    Matrix result(m_rowSize, m_colSize, 0.0);
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < m_colSize; j++)
        {
            result(i, j) = this->m_matrix[i][j] - scalar;
        }
    }
    return result;
}

Matrix Matrix::operator*(double scalar)
{
    Matrix result(m_rowSize, m_colSize, 0.0);
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < m_colSize; j++)
        {
            result(i, j) = this->m_matrix[i][j] * scalar;
        }
    }
    return result;
}

Matrix Matrix::operator/(double scalar)
{
    if (scalar == 0.0) {
        throw std::invalid_argument("Division by zero");
    }
    Matrix result(m_rowSize, m_colSize, 0.0);
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < m_colSize; j++)
        {
            result(i, j) = this->m_matrix[i][j] / scalar;
        }
    }
    return result;
}

double &Matrix::operator()(const unsigned &rowNo, const unsigned &colNo)
{
    return m_matrix[rowNo][colNo];
}

const double &Matrix::operator()(const unsigned &rowNo, const unsigned &colNo) const
{
    return m_matrix[rowNo][colNo];
}

unsigned Matrix::getRows() const
{
    return this->m_rowSize;
}

unsigned Matrix::getCols() const
{
    return this->m_colSize;
}

Matrix Matrix::transpose() const
{
    Matrix Transpose(m_colSize, m_rowSize, 0.0);
    for (unsigned i = 0; i < m_colSize; i++)
    {
        for (unsigned j = 0; j < m_rowSize; j++)
        {
            Transpose(i, j) = this->m_matrix[j][i];
        }
    }
    return Transpose;
}

void Matrix::prettyPrint(int precision, double eps) const
{
    std::cout << "Matrix:\n";
    int width = precision + 7;
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < m_colSize; j++)
        {
            double value = m_matrix[i][j];
            if (std::abs(value) < eps)
                value = 0.0;

            std::cout << "["
                      << std::setw(width)
                      << std::fixed
                      << std::setprecision(precision)
                      << value
                      << "]";
        }
        std::cout << '\n';
    }
}

Matrix Matrix::clean(double eps) const
{
    Matrix result(*this);
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < m_colSize; j++)
        {
            if (std::abs(result(i, j)) < eps)
                result(i, j) = 0.0;
        }
    }
    return result;
}

void Matrix::print() const
{
    std::cout << "Matrix: " << std::endl;
    for (unsigned i = 0; i < m_rowSize; i++)
    {
        for (unsigned j = 0; j < m_colSize; j++)
        {
            std::cout << "[" << m_matrix[i][j] << "] ";
        }
        std::cout << std::endl;
    }
}
