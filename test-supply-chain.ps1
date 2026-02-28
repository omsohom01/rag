# Test Supply Chain Product Upload
# Simulates a farmer sending a potato image with "20kg 2000 rupees" via WhatsApp

$RAG_URL = "https://rag-xru1.onrender.com"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTING SUPPLY CHAIN PRODUCT UPLOAD" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Download the potato image and convert to base64
Write-Host "[1/3] Downloading potato image and converting to base64..." -ForegroundColor Yellow
$imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Patates.jpg/220px-Patates.jpg"
$imageBytes = (Invoke-WebRequest -Uri $imageUrl -UseBasicParsing).Content
$imageBase64 = [Convert]::ToBase64String($imageBytes)
Write-Host "  Image base64 length: $($imageBase64.Length) chars" -ForegroundColor Green

# Step 2: Build the request body (simulating WhatsApp farmer message)
Write-Host "`n[2/3] Sending to $RAG_URL/supply-chain/product ..." -ForegroundColor Yellow
Write-Host "  Farmer says: '20kg 2000 rupees'" -ForegroundColor White
Write-Host "  Image: Potato photo" -ForegroundColor White

$body = @{
    imageBase64 = $imageBase64
    mimeType = "image/jpeg"
    captionText = "20kg 2000 rupees"
    farmerPhone = "+919876543210"
    farmerName = "Test Farmer Ram"
} | ConvertTo-Json -Depth 3

# Step 3: Send the request
Write-Host "`n[3/3] Waiting for AI analysis + Firebase upload..." -ForegroundColor Yellow
Write-Host "  (This may take 30-60 seconds on first call due to cold start)`n" -ForegroundColor DarkGray

try {
    $response = Invoke-RestMethod -Uri "$RAG_URL/supply-chain/product" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 120

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  RESPONSE FROM RAG BACKEND" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
    Write-Host "`nSuccess: $($response.success)" -ForegroundColor $(if ($response.success) { "Green" } else { "Red" })
    Write-Host "Message:`n$($response.message)" -ForegroundColor White
    
    if ($response.product) {
        Write-Host "`n--- Product Added to Firebase ---" -ForegroundColor Cyan
        Write-Host "  Doc ID:   $($response.product.id)" -ForegroundColor White
        Write-Host "  Name:     $($response.product.name)" -ForegroundColor White
        Write-Host "  Category: $($response.product.category)" -ForegroundColor White
        Write-Host "  Quantity: $($response.product.quantity) $($response.product.unit)" -ForegroundColor White
        Write-Host "  Rate:     Rs $($response.product.rate)/$($response.product.unit)" -ForegroundColor White
        Write-Host "  Total:    Rs $($response.product.totalPrice)" -ForegroundColor White
    }
    
    if ($response.analysis) {
        Write-Host "`n--- AI Analysis ---" -ForegroundColor Cyan
        Write-Host "  Is Product: $($response.analysis.isProduct)" -ForegroundColor White
        Write-Host "  Product:    $($response.analysis.productName)" -ForegroundColor White
        Write-Host "  Reason:     $($response.analysis.reason)" -ForegroundColor White
    }
} catch {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERROR" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Check Firebase Console -> Firestore" -ForegroundColor Cyan
Write-Host "  Collection: 'products'" -ForegroundColor Cyan
Write-Host "  Look for new doc with source='whatsapp'" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
