@echo off
cd apps\api
powershell -ExecutionPolicy Bypass -Command "node smoke-test.js"
cd ..\..
