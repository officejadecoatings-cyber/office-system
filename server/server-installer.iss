; Inno Setup Script for Office System Server
; Builds OfficeSystem-Server-Setup.exe

#define MyAppName "Office System Server"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Jade Coatings"
#define MyAppURL "https://www.jadecoatings.com"
#define MyAppExeName "ServerControl.bat"

[Setup]
AppId={{9F6F7C8D-0B1C-4B7E-933B-1B903E156A2B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\OfficeSystemServer
DefaultGroupName=Office System Server
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputDir=..\installers
OutputBaseFilename=OfficeSystem-Server-Setup
SetupIconFile=..\client-desktop\assets\icon.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Server source files
Source: "server.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "db.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "backup.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "migrate_data.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "tray-control.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "ServerControl.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "install-service.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "uninstall-service.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\client-desktop\assets\icon.ico"; DestDir: "{app}"; Flags: ignoreversion

; Bundled Node.js runtime (so the Server PC does NOT need Node.js pre-installed!)
Source: "node.exe"; DestDir: "{app}"; Flags: ignoreversion

; Bundled node_modules
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Office System Server Manager"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"
Name: "{group}\Uninstall Office System Server"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Office System Server Manager"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Dirs]
Name: "C:\OfficeSystem_Backups"; Permissions: users-full
Name: "{app}\data"; Permissions: users-full

[Run]
; 1. Automatically configure firewall and background startup service
Filename: "{app}\install-service.bat"; Parameters: ""; Flags: runhidden waituntilterminated; StatusMsg: "Configuring Windows Service and Firewall Port 3000..."

; 2. Optionally launch Server Control Console on finish
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Office System Server Manager"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Automatically unregister service and firewall rule on uninstall
Filename: "{app}\uninstall-service.bat"; Parameters: ""; Flags: runhidden waituntilterminated
