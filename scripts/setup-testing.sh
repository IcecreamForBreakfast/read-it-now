#!/bin/bash

echo "Setting up automated testing for Read-It-Later app..."

# Make pre-commit hook executable
chmod +x .githooks/pre-commit

# Configure Git to use our custom hooks
git config core.hooksPath .githooks

echo "✅ Git pre-commit hooks configured"
echo "✅ GitHub Actions workflow created"
echo ""
echo "Testing automation setup complete!"
echo ""
echo "Available test commands:"
echo "  npm test                    - Run all tests"
echo "  npm test tests/auth-working.test.ts - Run auth tests only"
echo "  npm test -- --watch        - Run tests in watch mode"
echo ""
echo "Automated testing:"
echo "  - Pre-commit hook runs auth tests before each commit"
echo "  - GitHub Actions runs full test suite on push/PR"
echo "  - Tests prevent broken authentication from reaching production"