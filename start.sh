#!/bin/bash

echo "🚀 LinkedIn Lead Generator - Quick Start"
echo "======================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Please copy env.example to .env and configure your settings:"
    echo "   cp env.example .env"
    echo "   nano .env"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Setting up database..."
npm run db:generate
npm run db:migrate

echo "🚀 Starting services..."
echo "📱 Web App: http://localhost:3000"
echo "⚙️  Background Worker: Running in background"
echo ""

# Start using Docker Compose
if command -v docker-compose &> /dev/null; then
    echo "🐳 Starting with Docker Compose..."
    docker-compose up --build
else
    echo "🟡 Docker Compose not found, starting manually..."
    echo "⚠️  Make sure PostgreSQL and Redis are running!"
    
    # Start worker in background
    npm run worker &
    WORKER_PID=$!
    
    # Start web app
    npm run dev
    
    # Clean up worker when script exits
    trap "kill $WORKER_PID" EXIT
fi 