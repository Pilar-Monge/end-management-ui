$file = "src\features\admin-dashboard\pages\AdminDashboardPage.tsx"
$lines = Get-Content $file
$total = $lines.Length
Write-Host "Total lines before:" $total
$kept = $lines[0..1953] + $lines[2141..($total - 1)]
Set-Content -Path $file -Value $kept -Encoding UTF8
Write-Host "Total lines after:" $kept.Length
