# Quick API Test Script
# Run this to verify all endpoints are working

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RAG BACKEND API TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "1. Testing /health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri http://localhost:3000/health -Method GET
    Write-Host "   ✅ Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Chat Endpoint
Write-Host "2. Testing /chat endpoint..." -ForegroundColor Yellow
try {
    $body = @{ query = "What is machine learning?" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri http://localhost:3000/chat -Method POST -Body $body -ContentType "application/json"
    Write-Host "   ✅ Answer received (${($response.answer.Length)} chars)" -ForegroundColor Green
    Write-Host "   ✅ Sources: $($response.sources.Count)" -ForegroundColor Green
    Write-Host "   Preview: $($response.answer.Substring(0, [Math]::Min(80, $response.answer.Length)))..." -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Validation (Empty Query)
Write-Host "3. Testing validation (empty query)..." -ForegroundColor Yellow
try {
    $emptyBody = @{ query = "" } | ConvertTo-Json
    Invoke-RestMethod -Uri http://localhost:3000/chat -Method POST -Body $emptyBody -ContentType "application/json" | Out-Null
    Write-Host "   ❌ Validation failed - empty query was accepted" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "   ✅ Validation working - empty query rejected (400)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: Validation (Missing Query)
Write-Host "4. Testing validation (missing query)..." -ForegroundColor Yellow
try {
    $noQuery = @{} | ConvertTo-Json
    Invoke-RestMethod -Uri http://localhost:3000/chat -Method POST -Body $noQuery -ContentType "application/json" | Out-Null
    Write-Host "   ❌ Validation failed - missing query was accepted" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "   ✅ Validation working - missing query rejected (400)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
