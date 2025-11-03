#!/bin/bash
# Quick installation script for performance monitoring

echo "📊 Installing Performance Monitoring System..."
echo ""

# Check if we're in the right directory
if [ ! -f "server.py" ]; then
    echo "❌ Error: server.py not found. Please run this script from the code/ directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pip install psutil

# Optional GPU monitoring
read -p "Do you want GPU monitoring? (requires NVIDIA GPU) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pip install pynvml
    echo "✅ GPU monitoring enabled"
fi

# Check if files exist
echo ""
echo "📋 Checking monitoring files..."

if [ ! -f "performance_monitor.py" ]; then
    echo "❌ performance_monitor.py not found!"
    exit 1
fi

if [ ! -f "performance_integration.py" ]; then
    echo "❌ performance_integration.py not found!"
    exit 1
fi

if [ ! -f "performance_dashboard.html" ]; then
    echo "❌ performance_dashboard.html not found!"
    exit 1
fi

echo "✅ All monitoring files present"
echo ""

# Backup server.py
echo "💾 Creating backup of server.py..."
cp server.py server.py.backup
echo "✅ Backup created: server.py.backup"
echo ""

# Instructions
echo "="
echo "📊 INSTALLATION COMPLETE!"
echo "="
echo ""
echo "Next steps:"
echo ""
echo "1. Add the code from server_performance_patch.py to your server.py"
echo "   (See PERFORMANCE_GUIDE.md for detailed instructions)"
echo ""
echo "2. Start your server:"
echo "   python server.py"
echo ""
echo "3. Open the dashboard:"
echo "   http://localhost:8000/dashboard"
echo ""
echo "4. Run load tests:"
echo "   python test_multi_user.py 5 60"
echo ""
echo "📖 Full documentation: PERFORMANCE_GUIDE.md"
echo ""
