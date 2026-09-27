@echo off
rem Same as start-native.cmd, but serves src/lib/mockData.ts instead of Supabase.
cd /d "%~dp0"
set EXPO_PUBLIC_USE_MOCK_DATA=1
"C:\Program Files\nodejs\node.exe" node_modules\expo\bin\cli start
