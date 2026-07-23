# Batch update API endpoints to add ensurePersisted()

$files = @(
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\sops\route.ts",
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\sops\[id]\route.ts",
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\categories\route.ts",
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\categories\[id]\route.ts",
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\announcements\route.ts",
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\announcements\[id]\route.ts",
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\tags\route.ts",
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\tags\[id]\route.ts",
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\sop-templates\route.ts",
    "C:\Users\tanaw\.copilot\repos\sop-knowledge-base\app\api\sop-templates\[id]\route.ts"
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "⚠️  Missing: $file"
        continue
    }
    
    $content = Get-Content $file -Raw
    
    # Skip if already has ensurePersisted
    if ($content -match "ensurePersisted") {
        Write-Host "✅ Already updated: $file"
        continue
    }
    
    # Skip if no saveDB calls
    if ($content -notmatch "saveDB\(") {
        Write-Host "⏭️  No mutations: $file"
        continue
    }
    
    # Add import if not exists
    if ($content -notmatch "from '@/lib/db-context'") {
        $content = $content -replace 
            "(import.*from '@/lib/db';)",
            "`$1`nimport { ensurePersisted } from '@/lib/db-context';"
    }
    
    # Add await ensurePersisted() before every return NextResponse.json
    $content = $content -replace 
        "(\n\s+)return NextResponse\.json\(",
        "`$1await ensurePersisted();`n`$1return NextResponse.json("
    
    Set-Content $file $content
    Write-Host "✏️  Updated: $file"
}

Write-Host "✓ Batch update complete"
