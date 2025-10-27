#!/bin/bash

echo "Testing Job Application Agent API"
echo "=================================="
echo ""

echo "1. Health Check:"
curl -s http://localhost:8000/health | jq
echo ""

echo "2. Root Endpoint:"
curl -s http://localhost:8000/ | jq
echo ""

echo "3. List Platforms:"
curl -s http://localhost:8000/platforms | jq
echo ""

echo "4. Check Connection Status (test_user/linkedin):"
curl -s http://localhost:8000/connection-status/test_user/linkedin | jq
echo ""

echo "=================================="
echo "✅ All basic endpoints working!"
echo ""
echo "Next steps:"
echo "- Visit http://localhost:8000/docs for interactive API documentation"
echo "- Test /connect-platform endpoint to connect a user to LinkedIn"
echo "- Test /apply-job endpoint to apply to a job"
