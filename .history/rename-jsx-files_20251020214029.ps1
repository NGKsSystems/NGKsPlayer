# PowerShell script to rename all .js files to .jsx in the components directory
$components = Get-ChildItem -Path "src\components" -Recurse -Filter "*.js"

foreach ($file in $components) {
    $newName = $file.Name -replace "\.js$", ".jsx"
    $newPath = Join-Path $file.Directory $newName
    
    Write-Host "Renaming: $($file.FullName) -> $newPath"
    Rename-Item -Path $file.FullName -NewName $newName
}

Write-Host "Finished renaming files!"