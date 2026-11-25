Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Form = New-Object System.Windows.Forms.Form
$Form.Text = "Office System - Server Control"
$Form.Size = New-Object System.Drawing.Size(460, 420)
$Form.StartPosition = "CenterScreen"
$Form.FormBorderStyle = "FixedDialog"
$Form.MaximizeBox = $false
$Form.BackColor = [System.Drawing.Color]::FromArgb(248, 250, 252)

# Icons and Header
$TitleLabel = New-Object System.Windows.Forms.Label
$TitleLabel.Text = "Office System Server Manager"
$TitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$TitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$TitleLabel.Location = New-Object System.Drawing.Point(20, 15)
$TitleLabel.Size = New-Object System.Drawing.Size(400, 28)
$Form.Controls.Add($TitleLabel)

$SubLabel = New-Object System.Windows.Forms.Label
$SubLabel.Text = "Dedicated Local Network Server & Background Service"
$SubLabel.Font = New-Object System.Drawing.Font("Segoe UI", 8.5)
$SubLabel.ForeColor = [System.Drawing.Color]::FromArgb(100, 116, 139)
$SubLabel.Location = New-Object System.Drawing.Point(20, 42)
$SubLabel.Size = New-Object System.Drawing.Size(400, 20)
$Form.Controls.Add($SubLabel)

# IP Box Group
$IpBox = New-Object System.Windows.Forms.Panel
$IpBox.Location = New-Object System.Drawing.Point(20, 70)
$IpBox.Size = New-Object System.Drawing.Size(400, 85)
$IpBox.BackColor = [System.Drawing.Color]::FromArgb(236, 253, 245)
$IpBox.BorderStyle = "FixedSingle"

$IpTitle = New-Object System.Windows.Forms.Label
$IpTitle.Text = "CLIENT CONNECT ADDRESS (SERVER LOCAL IP)"
$IpTitle.Font = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$IpTitle.ForeColor = [System.Drawing.Color]::FromArgb(4, 120, 87)
$IpTitle.Location = New-Object System.Drawing.Point(12, 10)
$IpTitle.Size = New-Object System.Drawing.Size(370, 18)
$IpBox.Controls.Add($IpTitle)

# Auto-detect IP
$localIps = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*","Ethernet*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }).IPAddress
if (!$localIps) { $localIps = "127.0.0.1" }
$PrimaryIp = $localIps[0]
$ServerUrl = "http://$PrimaryIp`:3000"

$IpText = New-Object System.Windows.Forms.TextBox
$IpText.Text = $ServerUrl
$IpText.Font = New-Object System.Drawing.Font("Consolas", 13, [System.Drawing.FontStyle]::Bold)
$IpText.ForeColor = [System.Drawing.Color]::FromArgb(6, 95, 70)
$IpText.BackColor = [System.Drawing.Color]::FromArgb(236, 253, 245)
$IpText.BorderStyle = "None"
$IpText.ReadOnly = $true
$IpText.Location = New-Object System.Drawing.Point(14, 32)
$IpText.Size = New-Object System.Drawing.Size(260, 25)
$IpBox.Controls.Add($IpText)

$CopyBtn = New-Object System.Windows.Forms.Button
$CopyBtn.Text = "Copy URL"
$CopyBtn.Font = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Bold)
$CopyBtn.Location = New-Object System.Drawing.Point(290, 26)
$CopyBtn.Size = New-Object System.Drawing.Size(95, 32)
$CopyBtn.BackColor = [System.Drawing.Color]::White
$CopyBtn.FlatStyle = "Flat"
$CopyBtn.Add_Click({
    [System.Windows.Forms.Clipboard]::SetText($ServerUrl)
    [System.Windows.Forms.MessageBox]::Show("Server URL copied to clipboard!`nEnter this address in the Client Desktop App on staff PCs.", "URL Copied", "OK", "Information")
})
$IpBox.Controls.Add($CopyBtn)

$IpNote = New-Object System.Windows.Forms.Label
$IpNote.Text = "Share this URL with staff desktop computers on the office network."
$IpNote.Font = New-Object System.Drawing.Font("Segoe UI", 7.5)
$IpNote.ForeColor = [System.Drawing.Color]::FromArgb(6, 95, 70)
$IpNote.Location = New-Object System.Drawing.Point(12, 60)
$IpNote.Size = New-Object System.Drawing.Size(370, 18)
$IpBox.Controls.Add($IpNote)
$Form.Controls.Add($IpBox)

# Status Label
$StatusLabel = New-Object System.Windows.Forms.Label
$StatusLabel.Text = "Checking service status..."
$StatusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$StatusLabel.Location = New-Object System.Drawing.Point(20, 168)
$StatusLabel.Size = New-Object System.Drawing.Size(400, 24)
$Form.Controls.Add($StatusLabel)

# Function to check status
function Update-ServiceStatus {
    try {
        $ping = Invoke-RestMethod -Uri "http://localhost:3000/api/ping" -TimeoutSec 2 -ErrorAction Stop
        if ($ping.ok) {
            $StatusLabel.Text = "● Server Service Status: ONLINE (Port 3000 Active)"
            $StatusLabel.ForeColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
        } else {
            $StatusLabel.Text = "○ Server Service Status: UNKNOWN"
            $StatusLabel.ForeColor = [System.Drawing.Color]::FromArgb(234, 179, 8)
        }
    } catch {
        $StatusLabel.Text = "○ Server Service Status: STOPPED / NOT LISTENING"
        $StatusLabel.ForeColor = [System.Drawing.Color]::FromArgb(239, 68, 68)
    }
}
Update-ServiceStatus

# Backup Now Button
$BackupBtn = New-Object System.Windows.Forms.Button
$BackupBtn.Text = "💾 Backup Database Now"
$BackupBtn.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$BackupBtn.ForeColor = [System.Drawing.Color]::White
$BackupBtn.BackColor = [System.Drawing.Color]::FromArgb(5, 150, 105)
$BackupBtn.FlatStyle = "Flat"
$BackupBtn.Location = New-Object System.Drawing.Point(20, 205)
$BackupBtn.Size = New-Object System.Drawing.Size(400, 38)
$BackupBtn.Add_Click({
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:3000/api/backup" -Method Post -TimeoutSec 10
        if ($res.ok) {
            [System.Windows.Forms.MessageBox]::Show("Backup completed successfully!`n`nSaved into C:\OfficeSystem_Backups:`n- SQLite Snapshot (.db)`n- Full Excel Workbook (.xlsx)", "Backup Success", "OK", "Information")
        } else {
            [System.Windows.Forms.MessageBox]::Show("Backup error: " + $res.error, "Backup Error", "OK", "Error")
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Could not connect to server on port 3000.`nPlease ensure the server service is running.", "Connection Failed", "OK", "Warning")
    }
})
$Form.Controls.Add($BackupBtn)

# Secondary Buttons Row
$WebBtn = New-Object System.Windows.Forms.Button
$WebBtn.Text = "🌐 Open Web Console"
$WebBtn.Font = New-Object System.Drawing.Font("Segoe UI", 8.5)
$WebBtn.Location = New-Object System.Drawing.Point(20, 255)
$WebBtn.Size = New-Object System.Drawing.Size(192, 34)
$WebBtn.BackColor = [System.Drawing.Color]::White
$WebBtn.FlatStyle = "Flat"
$WebBtn.Add_Click({
    Start-Process "http://localhost:3000"
})
$Form.Controls.Add($WebBtn)

$FolderBtn = New-Object System.Windows.Forms.Button
$FolderBtn.Text = "📂 Open Backups Folder"
$FolderBtn.Font = New-Object System.Drawing.Font("Segoe UI", 8.5)
$FolderBtn.Location = New-Object System.Drawing.Point(228, 255)
$FolderBtn.Size = New-Object System.Drawing.Size(192, 34)
$FolderBtn.BackColor = [System.Drawing.Color]::White
$FolderBtn.FlatStyle = "Flat"
$FolderBtn.Add_Click({
    if (!(Test-Path "C:\OfficeSystem_Backups")) {
        New-Item -ItemType Directory -Path "C:\OfficeSystem_Backups" -Force | Out-Null
    }
    Start-Process "explorer.exe" "C:\OfficeSystem_Backups"
})
$Form.Controls.Add($FolderBtn)

# Refresh Button
$RefreshBtn = New-Object System.Windows.Forms.Button
$RefreshBtn.Text = "🔄 Refresh Service Status"
$RefreshBtn.Font = New-Object System.Drawing.Font("Segoe UI", 8.5)
$RefreshBtn.Location = New-Object System.Drawing.Point(20, 300)
$RefreshBtn.Size = New-Object System.Drawing.Size(400, 32)
$RefreshBtn.BackColor = [System.Drawing.Color]::White
$RefreshBtn.FlatStyle = "Flat"
$RefreshBtn.Add_Click({
    Update-ServiceStatus
})
$Form.Controls.Add($RefreshBtn)

# Footer Note
$Footer = New-Object System.Windows.Forms.Label
$Footer.Text = "Automated Backups run twice daily at 12:30 PM & 4:45 PM (Retained 30 Days)"
$Footer.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$Footer.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
$Footer.TextAlign = "MiddleCenter"
$Footer.Location = New-Object System.Drawing.Point(20, 345)
$Footer.Size = New-Object System.Drawing.Size(400, 20)
$Form.Controls.Add($Footer)

[System.Windows.Forms.Application]::Run($Form)
